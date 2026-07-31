import type { TrapPilotDataset, TrapPilotRecord } from './trap-pilot.types';
import type { TrapPilotEvidenceBundle } from './trap-pilot.evidence';
import { validateTrapPilotEvidenceBundle } from './trap-pilot.evidence.validator';
import { validateTrapPilotDataset } from './trap-pilot.validator';

export type TrapPilotReviewDisposition =
  | 'BLOCKED'
  | 'NEEDS_EVIDENCE'
  | 'EVIDENCE_READY_FOR_REVIEW'
  | 'READY_FOR_EDITORIAL_REVIEW'
  | 'APPROVED'
  | 'DOWNGRADED'
  | 'REJECTED';

export interface TrapPilotRecordReview {
  recordId: string;
  title: string;
  disposition: TrapPilotReviewDisposition;
  reasons: string[];
  structuralErrors: number;
  structuralWarnings: number;
  hasGeneratedEngineSnapshot: boolean;
  hasGeneratedPopulationSnapshot: boolean;
}

export interface TrapPilotReviewReport {
  datasetVersion: string;
  recordCount: number;
  counts: Record<TrapPilotReviewDisposition, number>;
  records: TrapPilotRecordReview[];
  datasetErrors: number;
  evidenceBundleErrors: number;
}

function generatedEvidenceState(
  record: TrapPilotRecord,
  bundle: TrapPilotEvidenceBundle,
): { engine: boolean; population: boolean } {
  return {
    engine: bundle.engineSnapshots.some((snapshot) => snapshot.recordId === record.id),
    population: bundle.populationSnapshots.some((snapshot) => snapshot.recordId === record.id),
  };
}

function dispositionFor(
  record: TrapPilotRecord,
  structuralErrors: number,
  generated: { engine: boolean; population: boolean },
): { disposition: TrapPilotReviewDisposition; reasons: string[] } {
  const reasons: string[] = [];
  if (structuralErrors > 0) {
    return {
      disposition: 'BLOCKED',
      reasons: [`${structuralErrors} structural validation error(s) must be resolved.`],
    };
  }

  if (record.lifecycle === 'REJECTED' || record.editorial.reviewState === 'REJECTED') {
    return {
      disposition: 'REJECTED',
      reasons: [record.editorial.reviewRationale],
    };
  }
  if (record.editorial.reviewState === 'DOWNGRADED') {
    return {
      disposition: 'DOWNGRADED',
      reasons: [record.editorial.reviewRationale],
    };
  }
  if (record.lifecycle === 'VALIDATED' && record.editorial.reviewState === 'APPROVED') {
    return {
      disposition: 'APPROVED',
      reasons: [record.editorial.reviewRationale],
    };
  }

  const engineAvailable = record.evidence.engine.status === 'AVAILABLE';
  const populationAvailable = record.evidence.population.status === 'AVAILABLE';
  if (!engineAvailable) reasons.push(`Canonical engine evidence is ${record.evidence.engine.status}.`);
  if (!populationAvailable) reasons.push(`Canonical population evidence is ${record.evidence.population.status}.`);

  if ((!engineAvailable && generated.engine) || (!populationAvailable && generated.population)) {
    reasons.push('One or more generated snapshots exist but require canonical editorial acceptance.');
    return { disposition: 'EVIDENCE_READY_FOR_REVIEW', reasons };
  }

  if (!engineAvailable || !populationAvailable) {
    return { disposition: 'NEEDS_EVIDENCE', reasons };
  }

  reasons.push('Required evidence is available; editorial lifecycle and soundness review remain.');
  return { disposition: 'READY_FOR_EDITORIAL_REVIEW', reasons };
}

export function buildTrapPilotReviewReport(
  dataset: TrapPilotDataset,
  bundle: TrapPilotEvidenceBundle,
): TrapPilotReviewReport {
  const structuralReport = validateTrapPilotDataset(dataset);
  const evidenceReport = validateTrapPilotEvidenceBundle(dataset, bundle);
  const structuralByRecord = new Map(
    structuralReport.records.map((record) => [record.recordId, record.issues]),
  );

  const records = dataset.records.map((record) => {
    const issues = structuralByRecord.get(record.id) ?? [];
    const structuralErrors = issues.filter((issue) => issue.severity === 'ERROR').length;
    const structuralWarnings = issues.length - structuralErrors;
    const generated = generatedEvidenceState(record, bundle);
    const review = dispositionFor(record, structuralErrors, generated);
    return {
      recordId: record.id,
      title: record.title,
      disposition: review.disposition,
      reasons: review.reasons,
      structuralErrors,
      structuralWarnings,
      hasGeneratedEngineSnapshot: generated.engine,
      hasGeneratedPopulationSnapshot: generated.population,
    };
  });

  const counts: Record<TrapPilotReviewDisposition, number> = {
    BLOCKED: 0,
    NEEDS_EVIDENCE: 0,
    EVIDENCE_READY_FOR_REVIEW: 0,
    READY_FOR_EDITORIAL_REVIEW: 0,
    APPROVED: 0,
    DOWNGRADED: 0,
    REJECTED: 0,
  };
  for (const record of records) counts[record.disposition] += 1;

  return {
    datasetVersion: dataset.datasetVersion,
    recordCount: dataset.records.length,
    counts,
    records,
    datasetErrors: structuralReport.errorCount,
    evidenceBundleErrors: evidenceReport.errorCount,
  };
}

export function formatTrapPilotReviewReport(report: TrapPilotReviewReport): string {
  const lines = [
    `# Trap pilot editorial review — ${report.datasetVersion}`,
    '',
    `- Records: ${report.recordCount}`,
    `- Dataset errors: ${report.datasetErrors}`,
    `- Evidence bundle errors: ${report.evidenceBundleErrors}`,
    '',
    '## Dispositions',
    '',
  ];

  for (const [disposition, count] of Object.entries(report.counts)) {
    lines.push(`- ${disposition}: ${count}`);
  }

  for (const record of report.records) {
    lines.push('', `## ${record.title}`, '', `- Record: \`${record.recordId}\``, `- Disposition: **${record.disposition}**`);
    if (record.hasGeneratedEngineSnapshot) lines.push('- Generated engine snapshot: yes');
    if (record.hasGeneratedPopulationSnapshot) lines.push('- Generated population snapshot: yes');
    for (const reason of record.reasons) lines.push(`- ${reason}`);
  }

  return lines.join('\n');
}
