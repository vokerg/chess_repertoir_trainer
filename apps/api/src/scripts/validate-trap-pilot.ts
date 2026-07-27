import { writeFileSync } from 'node:fs';
import { TRAP_PILOT_DATASET } from '../modules/trap-pilot/trap-pilot.data';
import { TRAP_PILOT_EVIDENCE_BUNDLE } from '../modules/trap-pilot/trap-pilot.evidence.generated';
import { validateTrapPilotEvidenceBundle } from '../modules/trap-pilot/trap-pilot.evidence.validator';
import {
  buildTrapPilotReviewReport,
  formatTrapPilotReviewReport,
} from '../modules/trap-pilot/trap-pilot.review';
import {
  formatTrapPilotValidationReport,
  validateTrapPilotDataset,
} from '../modules/trap-pilot/trap-pilot.validator';

const report = validateTrapPilotDataset(TRAP_PILOT_DATASET);
const evidenceReport = validateTrapPilotEvidenceBundle(TRAP_PILOT_DATASET, TRAP_PILOT_EVIDENCE_BUNDLE);
const reviewReport = buildTrapPilotReviewReport(TRAP_PILOT_DATASET, TRAP_PILOT_EVIDENCE_BUNDLE);

const evidenceLines = [
  '# Trap pilot evidence bundle',
  '',
  `- Errors: ${evidenceReport.errorCount}`,
  `- Warnings: ${evidenceReport.warningCount}`,
  `- Valid: ${evidenceReport.valid ? 'yes' : 'no'}`,
  ...evidenceReport.issues.map(
    (issue) => `- **${issue.severity} ${issue.code}** — ${issue.path}: ${issue.message}`,
  ),
];

const output = [
  formatTrapPilotValidationReport(report),
  evidenceLines.join('\n'),
  formatTrapPilotReviewReport(reviewReport),
].join('\n\n');

console.log(output);

const reportPath = process.env['TRAP_PILOT_REPORT_PATH']?.trim();
if (reportPath) {
  writeFileSync(reportPath, `${output}\n`, 'utf8');
}

if (!report.valid || !evidenceReport.valid) process.exitCode = 1;
