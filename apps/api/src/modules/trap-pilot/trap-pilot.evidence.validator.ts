import { normalizeFenForPosition } from 'chess-domain';
import type { TrapPilotDataset } from './trap-pilot.types';
import type {
  TrapEngineEvidenceSnapshot,
  TrapPilotEvidenceBundle,
  TrapPopulationEvidenceSnapshot,
} from './trap-pilot.evidence';
import { hashTrapPilotEvidence } from './trap-pilot.evidence';
import {
  deriveTrapOccurrenceIdentity,
  type TrapPilotValidationIssue,
} from './trap-pilot.validator';

export interface TrapPilotEvidenceValidationReport {
  valid: boolean;
  errorCount: number;
  warningCount: number;
  issues: TrapPilotValidationIssue[];
}

function addIssue(
  issues: TrapPilotValidationIssue[],
  severity: 'ERROR' | 'WARNING',
  code: string,
  path: string,
  message: string,
): void {
  issues.push({ severity, code, path, message });
}

function verifyHash(
  snapshot: TrapEngineEvidenceSnapshot | TrapPopulationEvidenceSnapshot,
): boolean {
  const { payloadHash, ...payload } = snapshot;
  return payloadHash === hashTrapPilotEvidence(payload);
}

export function validateTrapPilotEvidenceBundle(
  dataset: TrapPilotDataset,
  bundle: TrapPilotEvidenceBundle,
): TrapPilotEvidenceValidationReport {
  const issues: TrapPilotValidationIssue[] = [];
  if (bundle.schemaVersion !== 1) {
    addIssue(issues, 'ERROR', 'UNSUPPORTED_EVIDENCE_SCHEMA', 'schemaVersion', `Unsupported evidence schema ${bundle.schemaVersion}.`);
  }
  if (bundle.datasetVersion !== dataset.datasetVersion) {
    addIssue(
      issues,
      'ERROR',
      'EVIDENCE_DATASET_VERSION_MISMATCH',
      'datasetVersion',
      `Evidence targets ${bundle.datasetVersion}, canonical dataset is ${dataset.datasetVersion}.`,
    );
  }

  const records = new Map(dataset.records.map((record) => [record.id, record]));
  const engineKeys = new Set<string>();
  const populationKeys = new Set<string>();

  for (const [index, snapshot] of bundle.engineSnapshots.entries()) {
    const path = `engineSnapshots[${index}]`;
    const record = records.get(snapshot.recordId);
    if (!record) {
      addIssue(issues, 'ERROR', 'UNKNOWN_EVIDENCE_RECORD', `${path}.recordId`, `Unknown record ${snapshot.recordId}.`);
      continue;
    }
    const expectedIdentity = deriveTrapOccurrenceIdentity(record);
    if (snapshot.occurrenceIdentity !== expectedIdentity) {
      addIssue(issues, 'ERROR', 'STALE_ENGINE_IDENTITY', `${path}.occurrenceIdentity`, 'Engine snapshot occurrence identity is stale.');
    }
    if (!verifyHash(snapshot)) {
      addIssue(issues, 'ERROR', 'INVALID_ENGINE_EVIDENCE_HASH', `${path}.payloadHash`, 'Engine snapshot payload hash does not match its content.');
    }
    const key = `${snapshot.recordId}:${snapshot.profile.version}`;
    if (engineKeys.has(key)) {
      addIssue(issues, 'ERROR', 'DUPLICATE_ENGINE_SNAPSHOT', path, `Duplicate engine snapshot ${key}.`);
    }
    engineKeys.add(key);
    if (!snapshot.targets.length) {
      addIssue(issues, 'ERROR', 'EMPTY_ENGINE_TARGETS', `${path}.targets`, 'Engine snapshot requires at least one analysed target.');
    }
    for (const [targetIndex, target] of snapshot.targets.entries()) {
      try {
        normalizeFenForPosition(target.fen);
      } catch {
        addIssue(issues, 'ERROR', 'INVALID_ENGINE_TARGET_FEN', `${path}.targets[${targetIndex}].fen`, 'Engine target FEN is invalid.');
      }
    }
    if (
      record.evidence.engine.status === 'AVAILABLE'
      && (
        record.evidence.engine.profile.version !== snapshot.profile.version
        || record.evidence.engine.payloadHash !== snapshot.payloadHash
      )
    ) {
      addIssue(issues, 'ERROR', 'ENGINE_MARKER_SNAPSHOT_MISMATCH', path, 'Canonical engine marker does not reference this available snapshot.');
    }
    if (record.evidence.engine.status !== 'AVAILABLE') {
      addIssue(issues, 'WARNING', 'UNREFERENCED_ENGINE_SNAPSHOT', path, 'Engine snapshot exists but canonical evidence is not marked AVAILABLE.');
    }
  }

  for (const [index, snapshot] of bundle.populationSnapshots.entries()) {
    const path = `populationSnapshots[${index}]`;
    const record = records.get(snapshot.recordId);
    if (!record) {
      addIssue(issues, 'ERROR', 'UNKNOWN_EVIDENCE_RECORD', `${path}.recordId`, `Unknown record ${snapshot.recordId}.`);
      continue;
    }
    const expectedIdentity = deriveTrapOccurrenceIdentity(record);
    if (snapshot.occurrenceIdentity !== expectedIdentity) {
      addIssue(issues, 'ERROR', 'STALE_POPULATION_IDENTITY', `${path}.occurrenceIdentity`, 'Population snapshot occurrence identity is stale.');
    }
    if (!verifyHash(snapshot)) {
      addIssue(issues, 'ERROR', 'INVALID_POPULATION_EVIDENCE_HASH', `${path}.payloadHash`, 'Population snapshot payload hash does not match its content.');
    }
    const key = `${snapshot.recordId}:${snapshot.profile.version}:${snapshot.profile.speedPreset}`;
    if (populationKeys.has(key)) {
      addIssue(issues, 'ERROR', 'DUPLICATE_POPULATION_SNAPSHOT', path, `Duplicate population snapshot ${key}.`);
    }
    populationKeys.add(key);
    try {
      const normalized = normalizeFenForPosition(snapshot.triggerFen);
      if (normalized !== record.trigger.normalizedFen) {
        addIssue(issues, 'ERROR', 'POPULATION_TRIGGER_MISMATCH', `${path}.triggerFen`, 'Population snapshot targets a different trigger position.');
      }
    } catch {
      addIssue(issues, 'ERROR', 'INVALID_POPULATION_TRIGGER_FEN', `${path}.triggerFen`, 'Population trigger FEN is invalid.');
    }
    if (
      record.evidence.population.status === 'AVAILABLE'
      && (
        record.evidence.population.profile.version !== snapshot.profile.version
        || record.evidence.population.payloadHash !== snapshot.payloadHash
      )
    ) {
      addIssue(issues, 'ERROR', 'POPULATION_MARKER_SNAPSHOT_MISMATCH', path, 'Canonical population marker does not reference this available snapshot.');
    }
    if (record.evidence.population.status !== 'AVAILABLE') {
      addIssue(issues, 'WARNING', 'UNREFERENCED_POPULATION_SNAPSHOT', path, 'Population snapshot exists but canonical evidence is not marked AVAILABLE.');
    }
  }

  for (const [recordIndex, record] of dataset.records.entries()) {
    if (record.evidence.engine.status === 'AVAILABLE') {
      const matching = bundle.engineSnapshots.some((snapshot) => (
        snapshot.recordId === record.id
        && snapshot.profile.version === record.evidence.engine.profile.version
        && snapshot.payloadHash === record.evidence.engine.payloadHash
      ));
      if (!matching) {
        addIssue(issues, 'ERROR', 'MISSING_ENGINE_SNAPSHOT', `records[${recordIndex}].evidence.engine`, 'AVAILABLE engine evidence has no matching bundle snapshot.');
      }
    }
    if (record.evidence.population.status === 'AVAILABLE') {
      const matching = bundle.populationSnapshots.some((snapshot) => (
        snapshot.recordId === record.id
        && snapshot.profile.version === record.evidence.population.profile.version
        && snapshot.payloadHash === record.evidence.population.payloadHash
      ));
      if (!matching) {
        addIssue(issues, 'ERROR', 'MISSING_POPULATION_SNAPSHOT', `records[${recordIndex}].evidence.population`, 'AVAILABLE population evidence has no matching bundle snapshot.');
      }
    }
  }

  const errorCount = issues.filter((issue) => issue.severity === 'ERROR').length;
  return {
    valid: errorCount === 0,
    errorCount,
    warningCount: issues.length - errorCount,
    issues,
  };
}
