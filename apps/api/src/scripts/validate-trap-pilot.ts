import { TRAP_PILOT_DATASET } from '../modules/trap-pilot/trap-pilot.data';
import {
  formatTrapPilotValidationReport,
  validateTrapPilotDataset,
} from '../modules/trap-pilot/trap-pilot.validator';

const report = validateTrapPilotDataset(TRAP_PILOT_DATASET);
console.log(formatTrapPilotValidationReport(report));

if (!report.valid) process.exitCode = 1;
