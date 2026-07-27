import { createHash } from 'node:crypto';
import { Chess } from 'chess.js';
import { normalizeFenForPosition } from 'chess-domain';
import type {
  TrapEvidenceMarker,
  TrapPilotDataset,
  TrapPilotRecord,
  TrapSide,
} from './trap-pilot.types';

export type TrapPilotValidationSeverity = 'ERROR' | 'WARNING';

export interface TrapPilotValidationIssue {
  severity: TrapPilotValidationSeverity;
  code: string;
  path: string;
  message: string;
}

export interface TrapPilotRecordValidation {
  recordId: string;
  occurrenceIdentity: string;
  issues: TrapPilotValidationIssue[];
}

export interface TrapPilotValidationReport {
  valid: boolean;
  datasetVersion: string;
  recordCount: number;
  errorCount: number;
  warningCount: number;
  records: TrapPilotRecordValidation[];
  issues: TrapPilotValidationIssue[];
}

const UCI_MOVE_PATTERN = /^[a-h][1-8][a-h][1-8][qrbn]?$/;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;

function addIssue(
  issues: TrapPilotValidationIssue[],
  severity: TrapPilotValidationSeverity,
  code: string,
  path: string,
  message: string,
): void {
  issues.push({ severity, code, path, message });
}

function createChess(fen?: string): Chess {
  if (!fen || fen === 'startpos') return new Chess();
  const parts = fen.trim().split(/\s+/);
  return new Chess(parts.length === 4 ? `${fen} 0 1` : fen);
}

function playUciMove(chess: Chess, moveUci: string): boolean {
  if (!UCI_MOVE_PATTERN.test(moveUci)) return false;
  try {
    return Boolean(chess.move({
      from: moveUci.slice(0, 2),
      to: moveUci.slice(2, 4),
      promotion: moveUci.slice(4, 5) || undefined,
    }));
  } catch {
    return false;
  }
}

function replayMoves(
  chess: Chess,
  movesUci: readonly string[],
  issues: TrapPilotValidationIssue[],
  path: string,
): boolean {
  if (movesUci.length === 0) {
    addIssue(issues, 'ERROR', 'EMPTY_MOVE_SEQUENCE', path, 'Move sequence must not be empty.');
    return false;
  }

  for (const [index, moveUci] of movesUci.entries()) {
    if (!playUciMove(chess, moveUci)) {
      addIssue(
        issues,
        'ERROR',
        'ILLEGAL_UCI_MOVE',
        `${path}[${index}]`,
        `Move ${moveUci} is invalid or illegal in the current position.`,
      );
      return false;
    }
  }
  return true;
}

function expectedOpponentTurn(sideSettingTrap: TrapSide): 'w' | 'b' {
  return sideSettingTrap === 'WHITE' ? 'b' : 'w';
}

function validateEvidence(
  marker: TrapEvidenceMarker,
  kind: 'engine' | 'population',
  record: TrapPilotRecord,
  issues: TrapPilotValidationIssue[],
): void {
  const path = `records.${record.id}.evidence.${kind}`;
  if (!marker.profile.id.trim() || !marker.profile.version.trim()) {
    addIssue(issues, 'ERROR', 'MISSING_EVIDENCE_PROFILE', path, 'Evidence profile id and version are required.');
  }

  if (marker.status === 'AVAILABLE') {
    if (!marker.capturedAt || !ISO_DATE_PATTERN.test(marker.capturedAt)) {
      addIssue(issues, 'ERROR', 'MISSING_EVIDENCE_TIMESTAMP', path, 'Available evidence requires an ISO UTC capturedAt timestamp.');
    }
    if (!marker.payloadHash?.trim()) {
      addIssue(issues, 'ERROR', 'MISSING_EVIDENCE_HASH', path, 'Available evidence requires a payload hash.');
    }
  } else {
    addIssue(
      issues,
      'WARNING',
      `${kind.toUpperCase()}_EVIDENCE_${marker.status}`,
      path,
      marker.reason?.trim() || `${kind} evidence is ${marker.status.toLowerCase()}.`,
    );
  }

  if (record.lifecycle === 'VALIDATED' && marker.status !== 'AVAILABLE') {
    addIssue(
      issues,
      'ERROR',
      'VALIDATED_RECORD_MISSING_EVIDENCE',
      path,
      `A VALIDATED record requires available ${kind} evidence.`,
    );
  }
}

export function deriveTrapOccurrenceIdentity(record: TrapPilotRecord): string {
  const payload = {
    trigger: record.trigger.normalizedFen,
    sideSettingTrap: record.sideSettingTrap,
    offer: record.offer?.moveUci ?? null,
    temptingResponses: record.temptingResponses
      .map((response) => response.movesUci.join(' '))
      .sort(),
    punishments: record.punishments
      .map((punishment) => `${punishment.againstResponseId}:${punishment.lineUci.join(' ')}`)
      .sort(),
  };
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

function validateRecord(record: TrapPilotRecord): TrapPilotRecordValidation {
  const issues: TrapPilotValidationIssue[] = [];
  const path = `records.${record.id}`;

  if (!record.id.trim()) addIssue(issues, 'ERROR', 'MISSING_RECORD_ID', path, 'Record id is required.');
  if (!record.title.trim()) addIssue(issues, 'ERROR', 'MISSING_TITLE', path, 'Record title is required.');
  if (!Number.isInteger(record.revision) || record.revision < 1) {
    addIssue(issues, 'ERROR', 'INVALID_REVISION', `${path}.revision`, 'Revision must be a positive integer.');
  }
  if (!record.trigger.setupRoutes.length) {
    addIssue(issues, 'ERROR', 'MISSING_SETUP_ROUTE', `${path}.trigger.setupRoutes`, 'At least one setup route is required.');
  }

  let primaryTriggerFen: string | null = null;
  for (const [routeIndex, route] of record.trigger.setupRoutes.entries()) {
    const routePath = `${path}.trigger.setupRoutes[${routeIndex}]`;
    const chess = createChess();
    if (record.offer && route.movesUci.at(-1) !== record.offer.moveUci) {
      addIssue(
        issues,
        'WARNING',
        'OFFER_NOT_ROUTE_ENDPOINT',
        routePath,
        `Setup route does not end with declared offer move ${record.offer.moveUci}.`,
      );
    }
    if (!replayMoves(chess, route.movesUci, issues, `${routePath}.movesUci`)) continue;

    const normalizedFen = normalizeFenForPosition(chess.fen());
    if (normalizedFen !== record.trigger.normalizedFen) {
      addIssue(
        issues,
        'ERROR',
        'TRIGGER_FEN_MISMATCH',
        `${routePath}.movesUci`,
        `Route reaches ${normalizedFen}, expected ${record.trigger.normalizedFen}.`,
      );
    }
    if (chess.turn() !== expectedOpponentTurn(record.sideSettingTrap)) {
      addIssue(
        issues,
        'ERROR',
        'TRIGGER_SIDE_MISMATCH',
        routePath,
        'The trigger position must leave the opponent of the trap-setting side to move.',
      );
    }
    if (primaryTriggerFen === null) {
      primaryTriggerFen = chess.fen();
    } else if (normalizeFenForPosition(primaryTriggerFen) !== normalizedFen) {
      addIssue(
        issues,
        'ERROR',
        'SETUP_ROUTES_DIVERGE',
        routePath,
        'All setup routes for one occurrence must converge on the same normalized trigger position.',
      );
    }
  }

  const responseIds = new Set<string>();
  const responsePositions = new Map<string, string>();
  for (const [responseIndex, response] of record.temptingResponses.entries()) {
    const responsePath = `${path}.temptingResponses[${responseIndex}]`;
    if (responseIds.has(response.id)) {
      addIssue(issues, 'ERROR', 'DUPLICATE_RESPONSE_ID', `${responsePath}.id`, `Duplicate response id ${response.id}.`);
    }
    responseIds.add(response.id);
    if (!response.explanation.trim()) {
      addIssue(issues, 'ERROR', 'MISSING_RESPONSE_EXPLANATION', responsePath, 'Tempting response explanation is required.');
    }
    if (primaryTriggerFen) {
      const chess = createChess(primaryTriggerFen);
      if (replayMoves(chess, response.movesUci, issues, `${responsePath}.movesUci`)) {
        responsePositions.set(response.id, chess.fen());
      }
    }
  }
  if (!record.temptingResponses.length) {
    addIssue(issues, 'ERROR', 'MISSING_TEMPTING_RESPONSE', `${path}.temptingResponses`, 'At least one tempting response is required.');
  }

  const punishedResponseIds = new Set<string>();
  for (const [punishmentIndex, punishment] of record.punishments.entries()) {
    const punishmentPath = `${path}.punishments[${punishmentIndex}]`;
    if (!responseIds.has(punishment.againstResponseId)) {
      addIssue(
        issues,
        'ERROR',
        'UNKNOWN_PUNISHMENT_RESPONSE',
        `${punishmentPath}.againstResponseId`,
        `Unknown tempting response ${punishment.againstResponseId}.`,
      );
      continue;
    }
    punishedResponseIds.add(punishment.againstResponseId);
    const responseFen = responsePositions.get(punishment.againstResponseId);
    if (responseFen) {
      const chess = createChess(responseFen);
      replayMoves(chess, punishment.lineUci, issues, `${punishmentPath}.lineUci`);
    }
    if (!punishment.explanation.trim()) {
      addIssue(issues, 'ERROR', 'MISSING_PUNISHMENT_EXPLANATION', punishmentPath, 'Punishment explanation is required.');
    }
  }
  if (!record.punishments.length) {
    addIssue(issues, 'ERROR', 'MISSING_PUNISHMENT', `${path}.punishments`, 'At least one punishment is required.');
  }
  for (const responseId of responseIds) {
    if (!punishedResponseIds.has(responseId)) {
      addIssue(
        issues,
        'ERROR',
        'UNPUNISHED_TEMPTING_RESPONSE',
        `${path}.punishments`,
        `Tempting response ${responseId} has no punishment line.`,
      );
    }
  }

  const temptingFirstMoves = new Set(record.temptingResponses.map((response) => response.movesUci[0]).filter(Boolean));
  if (!record.safeDefenses.length && record.lifecycle !== 'REFUTED' && record.lifecycle !== 'REJECTED') {
    addIssue(
      issues,
      'ERROR',
      'MISSING_SAFE_DEFENSE',
      `${path}.safeDefenses`,
      'At least one safe defense is required unless the record is explicitly REFUTED or REJECTED.',
    );
  }
  if (primaryTriggerFen) {
    for (const [defenseIndex, defense] of record.safeDefenses.entries()) {
      const defensePath = `${path}.safeDefenses[${defenseIndex}]`;
      const chess = createChess(primaryTriggerFen);
      if (!playUciMove(chess, defense.moveUci)) {
        addIssue(
          issues,
          'ERROR',
          'ILLEGAL_SAFE_DEFENSE',
          `${defensePath}.moveUci`,
          `Safe defense ${defense.moveUci} is illegal in the trigger position.`,
        );
      }
      if (temptingFirstMoves.has(defense.moveUci)) {
        addIssue(
          issues,
          'ERROR',
          'SAFE_DEFENSE_EQUALS_TEMPTATION',
          `${defensePath}.moveUci`,
          'A safe defense cannot be identical to the first move of a tempting response.',
        );
      }
      if (!defense.explanation.trim()) {
        addIssue(issues, 'ERROR', 'MISSING_DEFENSE_EXPLANATION', defensePath, 'Safe defense explanation is required.');
      }
    }
  }

  if (!record.provenance.length) {
    addIssue(issues, 'ERROR', 'MISSING_PROVENANCE', `${path}.provenance`, 'At least one provenance entry is required.');
  }
  for (const [sourceIndex, source] of record.provenance.entries()) {
    const sourcePath = `${path}.provenance[${sourceIndex}]`;
    for (const [field, value] of Object.entries({
      sourceId: source.sourceId,
      sourceRef: source.sourceRef,
      sourceVersion: source.sourceVersion,
      license: source.license,
      retrievedAt: source.retrievedAt,
    })) {
      if (!value.trim()) {
        addIssue(issues, 'ERROR', 'INCOMPLETE_PROVENANCE', `${sourcePath}.${field}`, `Provenance field ${field} is required.`);
      }
    }
    if (!ISO_DATE_PATTERN.test(source.retrievedAt)) {
      addIssue(issues, 'ERROR', 'INVALID_PROVENANCE_TIMESTAMP', `${sourcePath}.retrievedAt`, 'retrievedAt must be an ISO UTC timestamp.');
    }
  }

  if (record.setupSoundness === 'UNASSESSED') {
    addIssue(
      issues,
      'WARNING',
      'SETUP_SOUNDNESS_UNASSESSED',
      `${path}.setupSoundness`,
      'Setup soundness still requires evidence-backed classification.',
    );
  }
  validateEvidence(record.evidence.engine, 'engine', record, issues);
  validateEvidence(record.evidence.population, 'population', record, issues);

  return {
    recordId: record.id,
    occurrenceIdentity: deriveTrapOccurrenceIdentity(record),
    issues,
  };
}

export function validateTrapPilotDataset(dataset: TrapPilotDataset): TrapPilotValidationReport {
  const datasetIssues: TrapPilotValidationIssue[] = [];
  if (dataset.schemaVersion !== 1) {
    addIssue(datasetIssues, 'ERROR', 'UNSUPPORTED_SCHEMA_VERSION', 'schemaVersion', `Unsupported schema version ${dataset.schemaVersion}.`);
  }
  if (!dataset.datasetVersion.trim()) {
    addIssue(datasetIssues, 'ERROR', 'MISSING_DATASET_VERSION', 'datasetVersion', 'Dataset version is required.');
  }
  if (dataset.records.length < 20 || dataset.records.length > 50) {
    addIssue(
      datasetIssues,
      dataset.stage === 'PILOT' ? 'ERROR' : 'WARNING',
      'PILOT_SIZE_INCOMPLETE',
      'records',
      `Pilot requires 20–50 records; current dataset contains ${dataset.records.length}.`,
    );
  }

  const records = dataset.records.map(validateRecord);
  const recordIds = new Map<string, number>();
  const identities = new Map<string, string>();
  for (const [index, result] of records.entries()) {
    const existingIndex = recordIds.get(result.recordId);
    if (existingIndex !== undefined) {
      addIssue(
        datasetIssues,
        'ERROR',
        'DUPLICATE_RECORD_ID',
        `records[${index}].id`,
        `Record id ${result.recordId} is already used at index ${existingIndex}.`,
      );
    } else {
      recordIds.set(result.recordId, index);
    }

    const existingRecordId = identities.get(result.occurrenceIdentity);
    if (existingRecordId) {
      addIssue(
        datasetIssues,
        'ERROR',
        'DUPLICATE_OCCURRENCE_IDENTITY',
        `records[${index}]`,
        `Occurrence identity duplicates record ${existingRecordId}.`,
      );
    } else {
      identities.set(result.occurrenceIdentity, result.recordId);
    }
  }

  const issues = [...datasetIssues, ...records.flatMap((record) => record.issues)];
  const errorCount = issues.filter((issue) => issue.severity === 'ERROR').length;
  const warningCount = issues.length - errorCount;
  return {
    valid: errorCount === 0,
    datasetVersion: dataset.datasetVersion,
    recordCount: dataset.records.length,
    errorCount,
    warningCount,
    records,
    issues,
  };
}

export function formatTrapPilotValidationReport(report: TrapPilotValidationReport): string {
  const lines = [
    `# Trap pilot validation — ${report.datasetVersion}`,
    '',
    `- Records: ${report.recordCount}`,
    `- Errors: ${report.errorCount}`,
    `- Warnings: ${report.warningCount}`,
    `- Structurally valid: ${report.valid ? 'yes' : 'no'}`,
    '',
  ];

  for (const record of report.records) {
    const errors = record.issues.filter((issue) => issue.severity === 'ERROR').length;
    const warnings = record.issues.length - errors;
    lines.push(`## ${record.recordId}`, '', `- Identity: \`${record.occurrenceIdentity}\``, `- Errors: ${errors}`, `- Warnings: ${warnings}`, '');
    for (const issue of record.issues) {
      lines.push(`- **${issue.severity} ${issue.code}** — ${issue.path}: ${issue.message}`);
    }
    if (record.issues.length) lines.push('');
  }

  const datasetOnlyIssues = report.issues.filter((issue) => !issue.path.startsWith('records.'));
  if (datasetOnlyIssues.length) {
    lines.push('## Dataset issues', '');
    for (const issue of datasetOnlyIssues) {
      lines.push(`- **${issue.severity} ${issue.code}** — ${issue.path}: ${issue.message}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
