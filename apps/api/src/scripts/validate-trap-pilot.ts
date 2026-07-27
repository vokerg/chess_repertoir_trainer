import { TRAP_PILOT_DATASET } from '../modules/trap-pilot/trap-pilot.data';
import { TRAP_PILOT_EVIDENCE_BUNDLE } from '../modules/trap-pilot/trap-pilot.evidence.generated';
import { validateTrapPilotEvidenceBundle } from '../modules/trap-pilot/trap-pilot.evidence.validator';
import {
  formatTrapPilotValidationReport,
  validateTrapPilotDataset,
} from '../modules/trap-pilot/trap-pilot.validator';

const report = validateTrapPilotDataset(TRAP_PILOT_DATASET);
const evidenceReport = validateTrapPilotEvidenceBundle(TRAP_PILOT_DATASET, TRAP_PILOT_EVIDENCE_BUNDLE);

console.log(formatTrapPilotValidationReport(report));
console.log('# Trap pilot evidence bundle');
console.log('');
console.log(`- Errors: ${evidenceReport.errorCount}`);
console.log(`- Warnings: ${evidenceReport.warningCount}`);
console.log(`- Valid: ${evidenceReport.valid ? 'yes' : 'no'}`);
for (const issue of evidenceReport.issues) {
  console.log(`- **${issue.severity} ${issue.code}** — ${issue.path}: ${issue.message}`);
}

if (!report.valid || !evidenceReport.valid) process.exitCode = 1;
