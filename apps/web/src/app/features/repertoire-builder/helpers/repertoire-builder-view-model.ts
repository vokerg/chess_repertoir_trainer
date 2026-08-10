import type {
  CandidateDecisionCandidate,
  CandidateDecisionResponse,
  CandidatePersonalEvidence,
} from '@chess-trainer/contracts/candidate-decision';
import type {
  BuilderEvidenceReference,
  BuilderPreviewNode,
  BuilderSessionPreview,
} from 'chess-domain';
import { compactGameCount } from '../../../shared/games/game-count.helpers';
import type {
  RepertoireBuilderPreviewRow,
  RepertoireBuilderSourceItem,
} from '../state/repertoire-builder.models';

const REASON_LABELS: Record<string, string> = {
  ENGINE_BEST: 'Best stored engine line',
  ENGINE_CLOSE: 'Close to the best engine line',
  OBJECTIVE_COST: 'Carries an objective cost',
  POPULATION_COMMON: 'Common in the selected population',
  POPULATION_STRONG_SCORE: 'Outperforms the position baseline in the selected population',
  MASTER_SUPPORTED: 'Supported by master practice',
  PERSONALLY_FAMILIAR: 'Already familiar from your games',
  PERSONAL_RESULTS_POSITIVE: 'Positive personal results',
  TARGET_CHARACTER_MATCH: 'Matches the selected repertoire character',
  TARGET_THEORY_MATCH: 'Fits the selected theory limit',
  TARGET_SOUNDNESS_CONFLICT: 'Conflicts with the selected soundness target',
  TARGET_THEORY_EXCEEDED: 'Exceeds the selected theory limit',
  PROFILE_PREFERENCE_MATCH: 'Matches your observed preferences',
  PROFILE_PERFORMANCE_SUPPORT: 'Supported by your observed performance',
  PROFILE_PERFORMANCE_WARNING: 'Your observed performance suggests caution',
  COURSE_ALREADY_COVERS: 'Already covered in a course',
  COURSE_CONFLICT: 'Conflicts with existing course material',
  TRANSPOSES_TO_COVERAGE: 'Transposes to covered material',
  COMMON_AT_TARGET_LEVEL: 'Common at the target level',
  PERSONALLY_ENCOUNTERED: 'Seen in your own games',
  DANGEROUS_RESPONSE: 'Important practical response',
  LOW_EVIDENCE: 'Evidence is limited',
  MANUAL_CANDIDATE: 'Included from the board',
};

const PRIMARY_EVIDENCE_REASON_CODES = new Set([
  'ENGINE_BEST',
  'ENGINE_CLOSE',
  'OBJECTIVE_COST',
  'POPULATION_COMMON',
  'POPULATION_STRONG_SCORE',
  'MASTER_SUPPORTED',
  'PERSONALLY_FAMILIAR',
  'PERSONAL_RESULTS_POSITIVE',
  'COURSE_ALREADY_COVERS',
  'COURSE_CONFLICT',
  'TRANSPOSES_TO_COVERAGE',
  'COMMON_AT_TARGET_LEVEL',
  'PERSONALLY_ENCOUNTERED',
  'DANGEROUS_RESPONSE',
  'LOW_EVIDENCE',
  'MANUAL_CANDIDATE',
]);

const WARNING_LABELS: Record<string, string> = {
  FORCED_MATE_AGAINST_TARGET: 'Stored analysis indicates forced mate against the repertoire side.',
  OBJECTIVE_LOSS: 'This move gives up substantial objective value.',
  LOW_ENGINE_DEPTH: 'Stored engine depth is limited.',
  TARGET_SOUNDNESS_MISMATCH: 'This move conflicts with the selected soundness target.',
  THEORY_BUDGET_EXCEEDED: 'This move exceeds the selected theory budget.',
  SPARSE_PERSONAL_EVIDENCE: 'Personal evidence is sparse.',
  COURSE_CONFLICT: 'Existing course material conflicts with this move.',
  SOURCE_UNAVAILABLE: 'One or more evidence sources are unavailable.',
};

export interface RepertoireBuilderCorpusMetric {
  primary: string;
  secondary: string;
}

export function reasonLabel(code: string): string {
  return REASON_LABELS[code] ?? readableCode(code);
}

export function warningLabel(code: string): string {
  return WARNING_LABELS[code] ?? readableCode(code);
}

export function primaryEvidenceReasonLabels(
  candidate: CandidateDecisionCandidate,
  limit = 3,
): readonly string[] {
  return candidate.reasonCodes
    .filter((code) => PRIMARY_EVIDENCE_REASON_CODES.has(code))
    .slice(0, Math.max(0, limit))
    .map(reasonLabel);
}

export function corpusEvidenceMetric(
  evidence: CandidateDecisionCandidate['evidence']['population'],
): RepertoireBuilderCorpusMetric {
  const primary = percent(evidence.frequencyPercent);
  const details: string[] = [];
  if (evidence.scoreDeltaVsPositionPercent !== null
    && evidence.scoreDeltaVsPositionPercent !== undefined) {
    details.push(`${signedPercent(evidence.scoreDeltaVsPositionPercent)} vs position`);
  }
  if (evidence.games > 0) details.push(`${compactGameCount(evidence.games)} games`);
  return {
    primary,
    secondary: details.join(' · ') || readableCode(evidence.status),
  };
}

export function courseRelationshipLabel(candidate: CandidateDecisionCandidate): string | null {
  const course = candidate.evidence.course;
  if (course.status === 'UNAVAILABLE') return 'Course unavailable';
  if (course.conflict) return 'Course conflict';
  if (course.covered) return 'Already in course';
  if (course.transposesToCoveredPosition) return 'Transposes to course';
  return null;
}

export function personalEvidenceLabel(evidence: CandidatePersonalEvidence): string {
  if (evidence.status === 'UNAVAILABLE' || evidence.familiarity === null) return 'History unavailable';
  const familiarity = evidence.familiarity === 'COMMON'
    ? 'Common for you'
    : evidence.familiarity === 'RARE'
      ? 'Rare for you'
      : 'New to you';
  if (!evidence.resultSampleQualified) return familiarity;
  const result = evidence.resultContext === 'ABOVE_BASELINE'
    ? 'results above position baseline'
    : evidence.resultContext === 'BELOW_BASELINE'
      ? 'results below position baseline'
      : evidence.resultContext === 'NEUTRAL'
        ? 'results near position baseline'
        : null;
  return result ? `${familiarity} · ${result}` : familiarity;
}

export function personalEvidenceDetail(evidence: CandidatePersonalEvidence): string | null {
  if (evidence.status === 'UNAVAILABLE') return null;
  const details: string[] = [];
  if (evidence.familiarity === 'NEW') {
    details.push('No indexed games with this move from the exact position');
  } else {
    details.push(`${evidence.gameCount} indexed ${evidence.gameCount === 1 ? 'game' : 'games'}`);
    if (evidence.moveSharePercent !== null) {
      details.push(`${percent(evidence.moveSharePercent)} of choices`);
    }
    if (evidence.lastPlayedAt) details.push(`last played ${evidence.lastPlayedAt.slice(0, 10)}`);
    if (evidence.games > 0) {
      details.push(`${evidence.games} result ${evidence.games === 1 ? 'game' : 'games'} · ${percent(evidence.scorePercent)} score`);
      if (!evidence.resultSampleQualified) details.push('result sample too small for a good/bad label');
    }
    if (evidence.resultSampleQualified && evidence.scoreDeltaVsPositionPercent !== null) {
      details.push(`${signedPercent(evidence.scoreDeltaVsPositionPercent)} vs position baseline`);
    }
  }
  details.push(personalFilterDetail(evidence));
  return details.join(' · ');
}

export function buildRepertoireBuilderSourceItems(
  candidate: CandidateDecisionCandidate | null,
): readonly RepertoireBuilderSourceItem[] {
  if (!candidate) return [];

  return [
    {
      id: 'population',
      label: 'Target population',
      status: candidate.evidence.population.status,
      detail: corpusDetail(
        candidate.evidence.population.games,
        candidate.evidence.population.frequencyPercent,
        candidate.evidence.population.scorePercentForTarget,
      ),
    },
    {
      id: 'masters',
      label: 'Masters',
      status: candidate.evidence.masters.status,
      detail: corpusDetail(
        candidate.evidence.masters.games,
        candidate.evidence.masters.frequencyPercent,
        candidate.evidence.masters.scorePercentForTarget,
      ),
    },
    {
      id: 'personal',
      label: 'Your games',
      status: candidate.evidence.personal.status,
      detail: personalEvidenceDetail(candidate.evidence.personal),
    },
    {
      id: 'profile',
      label: 'Chess profile',
      status: candidate.evidence.playerProfile.status,
      detail:
        candidate.evidence.playerProfile.matches.length > 0
          ? `${candidate.evidence.playerProfile.matches.length} matching observations`
          : null,
    },
  ];
}

export function buildRepertoireBuilderEvidenceReference(
  response: CandidateDecisionResponse,
): BuilderEvidenceReference {
  const sourceVersions: Record<string, string> = {
    engine: response.sourceSummary.engine,
    masters: response.sourceSummary.masters,
    population: response.sourceSummary.population,
    personal: response.sourceSummary.personal,
    opening: response.sourceSummary.opening,
    courses: response.sourceSummary.courses,
    playerProfile: response.sourceSummary.playerProfile,
  };
  const mastersDatasetVersion = response.candidates.find(
    (candidate) => candidate.evidence.masters.datasetVersion !== null,
  )?.evidence.masters.datasetVersion;
  const populationDatasetVersion = response.candidates.find(
    (candidate) => candidate.evidence.population.datasetVersion !== null,
  )?.evidence.population.datasetVersion;
  const personalEvidencePolicy = response.candidates.find(
    (candidate) => candidate.evidence.personal.policyVersion !== null,
  )?.evidence.personal.policyVersion;
  const openingClassificationVersion = response.candidates.find(
    (candidate) => candidate.evidence.opening.classificationVersion !== null,
  )?.evidence.opening.classificationVersion;
  const openingKnowledgeVersion = response.candidates.find(
    (candidate) => candidate.evidence.opening.knowledge.version !== null,
  )?.evidence.opening.knowledge.version;
  const playerProfileGeneratedAt = response.candidates.find(
    (candidate) => candidate.evidence.playerProfile.generatedAt !== null,
  )?.evidence.playerProfile.generatedAt;

  if (mastersDatasetVersion) sourceVersions['mastersDataset'] = mastersDatasetVersion;
  if (populationDatasetVersion) sourceVersions['populationDataset'] = populationDatasetVersion;
  if (personalEvidencePolicy) sourceVersions['personalEvidencePolicy'] = personalEvidencePolicy;
  if (openingClassificationVersion)
    sourceVersions['openingClassification'] = openingClassificationVersion;
  if (openingKnowledgeVersion) sourceVersions['openingKnowledge'] = openingKnowledgeVersion;
  if (playerProfileGeneratedAt)
    sourceVersions['playerProfileGeneratedAt'] = playerProfileGeneratedAt;

  return {
    candidateContractVersion: response.contractVersion,
    rankingPolicyVersion: response.rankingPolicyVersion,
    generatedAt: response.generatedAt,
    normalizedFen: response.normalizedFen,
    sourceVersions,
  };
}

export function buildRepertoireBuilderPreviewRows(
  preview: BuilderSessionPreview | null,
): readonly RepertoireBuilderPreviewRow[] {
  if (!preview) return [];
  const rows: RepertoireBuilderPreviewRow[] = [];
  visitPreview(preview.tree, rows, 0);
  return rows;
}

function visitPreview(
  node: BuilderPreviewNode,
  rows: RepertoireBuilderPreviewRow[],
  depth: number,
): void {
  const selected = node.activeDecision?.selectedMoves.map((move) => move.moveSan).join(', ');
  rows.push({
    branchId: node.branchId,
    depth,
    moveLabel: selected || node.pathUci.at(-1) || 'Initial position',
    roleLabel: node.role === 'USER_MOVE' ? 'Your move' : 'Opponent responses',
    status: readableCode(node.status),
    transpositionOfBranchId: node.transpositionOfBranchId,
  });
  for (const child of node.children) visitPreview(child, rows, depth + 1);
}

function corpusDetail(
  games: number,
  frequency: number | null,
  score: number | null,
): string | null {
  if (games <= 0) return null;
  return `${compactGameCount(games)} games · ${percent(frequency)} frequency · ${percent(score)} score`;
}

function personalFilterDetail(evidence: CandidatePersonalEvidence): string {
  const filter = evidence.filterContext;
  const accounts = filter.accountScope === 'ALL_USER_ACCOUNTS'
    ? 'all accounts'
    : `${filter.accountIds.length} selected ${filter.accountIds.length === 1 ? 'account' : 'accounts'}`;
  return `${filter.side === 'WHITE' ? 'White' : 'Black'} · ${filter.rated ? 'rated' : 'rated + casual'} · ${filter.speedCategories.join('/')} · all indexed history · ${accounts}`;
}

function percent(value: number | null): string {
  return value === null ? '—' : `${Math.round(value)}%`;
}

function signedPercent(value: number): string {
  return `${value > 0 ? '+' : ''}${Math.round(value)}pp`;
}

function readableCode(value: string): string {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
