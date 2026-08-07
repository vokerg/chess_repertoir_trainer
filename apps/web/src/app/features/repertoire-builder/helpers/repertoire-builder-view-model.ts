import type {
  CandidateDecisionCandidate,
  CandidateDecisionResponse,
  CandidateOpeningKnowledgePlan,
} from '@chess-trainer/contracts/candidate-decision';
import type {
  BuilderEvidenceReference,
  BuilderPreviewNode,
  BuilderSessionPreview,
} from 'chess-domain';
import { compactGameCount } from '../../../shared/lichess-games-explorer/lichess-games-explorer.helpers';
import type {
  RepertoireBuilderPreviewRow,
  RepertoireBuilderSourceItem,
} from '../state/repertoire-builder.models';

const REASON_LABELS: Record<string, string> = {
  ENGINE_BEST: 'Best stored engine line',
  ENGINE_CLOSE: 'Close to the best engine line',
  OBJECTIVE_COST: 'Carries an objective cost',
  POPULATION_COMMON: 'Common in the selected population',
  POPULATION_STRONG_SCORE: 'Scores well in the selected population',
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

export function reasonLabel(code: string): string {
  return REASON_LABELS[code] ?? readableCode(code);
}

export function warningLabel(code: string): string {
  return WARNING_LABELS[code] ?? readableCode(code);
}

export function buildRepertoireBuilderSourceItems(
  candidate: CandidateDecisionCandidate | null,
): readonly RepertoireBuilderSourceItem[] {
  if (!candidate) return [];
  const knowledge = candidate.evidence.opening.knowledge;
  const targetSide = candidate.evidence.opening.side === 'WHITE' ? 'White' : 'Black';
  const knowledgeItems: RepertoireBuilderSourceItem[] = [{
    id: 'opening-knowledge',
    label: `Opening knowledge · ${targetSide}`,
    status: knowledge.status,
    detail: knowledge.strategicSummary?.text
      ?? knowledge.shortDescription?.text
      ?? 'No reviewed strategic knowledge is available for this opening and side.',
  }];
  knowledgeItems.push(...knowledge.plans.map((plan) => openingPlanSourceItem(plan)));

  return [
    {
      id: 'population',
      label: 'Target population',
      status: candidate.evidence.population.status,
      detail: corpusDetail(candidate.evidence.population.games, candidate.evidence.population.frequencyPercent, candidate.evidence.population.scorePercentForTarget),
    },
    {
      id: 'masters',
      label: 'Masters',
      status: candidate.evidence.masters.status,
      detail: corpusDetail(candidate.evidence.masters.games, candidate.evidence.masters.frequencyPercent, candidate.evidence.masters.scorePercentForTarget),
    },
    {
      id: 'personal',
      label: 'Your games',
      status: candidate.evidence.personal.status,
      detail: candidate.evidence.personal.games > 0
        ? `${candidate.evidence.personal.games} games · ${percent(candidate.evidence.personal.scorePercent)} score`
        : null,
    },
    {
      id: 'opening',
      label: 'Opening profile',
      status: candidate.evidence.opening.status,
      detail: candidate.evidence.opening.opening?.name ?? null,
    },
    ...knowledgeItems,
    {
      id: 'profile',
      label: 'Chess profile',
      status: candidate.evidence.playerProfile.status,
      detail: candidate.evidence.playerProfile.matches.length > 0
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
  if (openingClassificationVersion) sourceVersions['openingClassification'] = openingClassificationVersion;
  if (openingKnowledgeVersion) sourceVersions['openingKnowledge'] = openingKnowledgeVersion;
  if (playerProfileGeneratedAt) sourceVersions['playerProfileGeneratedAt'] = playerProfileGeneratedAt;

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

function openingPlanSourceItem(plan: CandidateOpeningKnowledgePlan): RepertoireBuilderSourceItem {
  const qualifiers = [
    ...plan.conditions.map((value) => `When: ${value}`),
    ...plan.caveats.map((value) => `Caveat: ${value}`),
  ];
  return {
    id: `opening-plan-${plan.id}`,
    label: plan.title,
    status: `${plan.confidence} confidence`,
    detail: [plan.summary, ...qualifiers].join(' · '),
  };
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

function corpusDetail(games: number, frequency: number | null, score: number | null): string | null {
  if (games <= 0) return null;
  return `${compactGameCount(games)} games · ${percent(frequency)} frequency · ${percent(score)} score`;
}

function percent(value: number | null): string {
  return value === null ? '—' : `${Math.round(value)}%`;
}

function readableCode(value: string): string {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
