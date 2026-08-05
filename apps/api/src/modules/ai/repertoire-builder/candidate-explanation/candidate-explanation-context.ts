import type {
  AiBuilderCandidateExplanationContent,
  AiBuilderCandidateExplanationFact,
} from '@chess-trainer/contracts/ai';
import type {
  CandidateDecisionCandidate,
  CandidateDecisionResponse,
  CandidateEvidenceStatus,
} from '@chess-trainer/contracts/candidate-decision';
import { AiFeatureError } from '../../ai.errors';

export interface CandidateExplanationContext {
  facts: AiBuilderCandidateExplanationFact[];
  referencedFacts(explanation: AiBuilderCandidateExplanationContent): AiBuilderCandidateExplanationFact[];
  reconcile(explanation: AiBuilderCandidateExplanationContent): AiBuilderCandidateExplanationContent;
}

export function buildCandidateExplanationContext(
  response: CandidateDecisionResponse,
  selected: CandidateDecisionCandidate,
  comparison: CandidateDecisionCandidate | null,
): CandidateExplanationContext {
  const facts = buildFacts(response, selected, comparison);
  const factsById = new Map(facts.map((fact) => [fact.id, fact]));
  const allowedMoves = new Set([
    selected.moveUci.toLowerCase(),
    selected.moveSan.toLowerCase(),
    comparison?.moveUci.toLowerCase(),
    comparison?.moveSan.toLowerCase(),
  ].filter(isString));

  return {
    facts,
    referencedFacts: (explanation) => collectReferencedFacts(explanation, factsById),
    reconcile: (explanation) => reconcileExplanation(explanation, factsById, allowedMoves),
  };
}

function buildFacts(
  response: CandidateDecisionResponse,
  selected: CandidateDecisionCandidate,
  comparison: CandidateDecisionCandidate | null,
): AiBuilderCandidateExplanationFact[] {
  const facts = new Map<string, AiBuilderCandidateExplanationFact>();
  const add = (fact: AiBuilderCandidateExplanationFact) => facts.set(fact.id, fact);

  for (const [source, status] of Object.entries(response.sourceSummary)) {
    add({
      id: `source.${source.toLowerCase()}`,
      label: `${humanize(source)} source`,
      value: humanize(status),
      missing: status !== 'AVAILABLE',
    });
  }

  addCandidateFacts(add, 'selected', selected);
  if (comparison) addCandidateFacts(add, 'comparison', comparison);
  return [...facts.values()];
}

function addCandidateFacts(
  add: (fact: AiBuilderCandidateExplanationFact) => void,
  prefix: 'selected' | 'comparison',
  candidate: CandidateDecisionCandidate,
): void {
  addFact(add, `${prefix}.move`, `${humanize(prefix)} move`, `${candidate.moveSan} (${candidate.moveUci})`);
  addFact(add, `${prefix}.rank`, `${humanize(prefix)} deterministic rank`, `#${candidate.rank}`);
  addFact(add, `${prefix}.eligibility`, `${humanize(prefix)} eligibility`, humanize(candidate.eligibility.status));
  addFact(add, `${prefix}.target_fit`, `${humanize(prefix)} target fit`, humanize(candidate.targetFit.status));
  addFact(add, `${prefix}.profile_fit`, `${humanize(prefix)} profile fit`, humanize(candidate.profileFit.status));

  for (const code of candidate.reasonCodes) {
    addFact(add, `${prefix}.reason.${code.toLowerCase()}`, `${humanize(prefix)} reason`, humanize(code));
  }
  for (const code of candidate.warningCodes) {
    addFact(add, `${prefix}.warning.${code.toLowerCase()}`, `${humanize(prefix)} warning`, humanize(code));
  }

  const engine = candidate.evidence.engine;
  addStatusFact(add, `${prefix}.engine_status`, `${humanize(prefix)} engine evidence`, engine.status);
  if (engine.scoreCpForTarget !== null) {
    addFact(add, `${prefix}.engine_score`, `${humanize(prefix)} engine score`, formatCentipawns(engine.scoreCpForTarget));
  }
  if (engine.depth !== null) {
    addFact(add, `${prefix}.engine_depth`, `${humanize(prefix)} engine depth`, String(engine.depth));
  }

  addCorpusFacts(add, prefix, 'population', candidate.evidence.population);
  addCorpusFacts(add, prefix, 'masters', candidate.evidence.masters);

  const personal = candidate.evidence.personal;
  addStatusFact(add, `${prefix}.personal_status`, `${humanize(prefix)} personal evidence`, personal.status);
  if (personal.occurrences > 0) {
    addFact(add, `${prefix}.personal_occurrences`, `${humanize(prefix)} personal occurrences`, String(personal.occurrences));
  }
  if (personal.scorePercent !== null) {
    addFact(add, `${prefix}.personal_score`, `${humanize(prefix)} personal score`, formatPercent(personal.scorePercent));
  }

  const opening = candidate.evidence.opening;
  addStatusFact(add, `${prefix}.opening_status`, `${humanize(prefix)} opening evidence`, opening.status);
  if (opening.opening) {
    addFact(add, `${prefix}.opening_name`, `${humanize(prefix)} opening`, opening.opening.name);
  }

  const course = candidate.evidence.course;
  addStatusFact(add, `${prefix}.course_status`, `${humanize(prefix)} course evidence`, course.status);
  addFact(
    add,
    `${prefix}.course_state`,
    `${humanize(prefix)} course state`,
    course.conflict
      ? 'Conflict'
      : course.covered
        ? 'Covered'
        : course.transposesToCoveredPosition
          ? 'Transposes to coverage'
          : 'New',
  );

  addStatusFact(
    add,
    `${prefix}.player_profile_status`,
    `${humanize(prefix)} player profile evidence`,
    candidate.evidence.playerProfile.status,
  );

  if (candidate.coverage?.contributionPercent !== null && candidate.coverage?.contributionPercent !== undefined) {
    addFact(
      add,
      `${prefix}.coverage_contribution`,
      `${humanize(prefix)} coverage contribution`,
      formatPercent(candidate.coverage.contributionPercent),
    );
  }
}

function addCorpusFacts(
  add: (fact: AiBuilderCandidateExplanationFact) => void,
  prefix: 'selected' | 'comparison',
  source: 'population' | 'masters',
  evidence: CandidateDecisionCandidate['evidence']['population'],
): void {
  addStatusFact(add, `${prefix}.${source}_status`, `${humanize(prefix)} ${source} evidence`, evidence.status);
  if (evidence.games > 0) {
    addFact(add, `${prefix}.${source}_games`, `${humanize(prefix)} ${source} games`, String(evidence.games));
  }
  if (evidence.frequencyPercent !== null) {
    addFact(add, `${prefix}.${source}_frequency`, `${humanize(prefix)} ${source} frequency`, formatPercent(evidence.frequencyPercent));
  }
  if (evidence.scorePercentForTarget !== null) {
    addFact(add, `${prefix}.${source}_score`, `${humanize(prefix)} ${source} score`, formatPercent(evidence.scorePercentForTarget));
  }
}

function addStatusFact(
  add: (fact: AiBuilderCandidateExplanationFact) => void,
  id: string,
  label: string,
  status: CandidateEvidenceStatus,
): void {
  add({ id, label, value: humanize(status), missing: status !== 'AVAILABLE' });
}

function addFact(
  add: (fact: AiBuilderCandidateExplanationFact) => void,
  id: string,
  label: string,
  value: string,
): void {
  add({ id, label, value, missing: false });
}

function reconcileExplanation(
  explanation: AiBuilderCandidateExplanationContent,
  factsById: ReadonlyMap<string, AiBuilderCandidateExplanationFact>,
  allowedMoves: ReadonlySet<string>,
): AiBuilderCandidateExplanationContent {
  const allReferenceIds = collectReferenceIds(explanation);
  for (const referenceId of allReferenceIds) {
    if (!factsById.has(referenceId)) {
      throw invalidResponse('AI explanation referenced unsupported evidence.');
    }
  }
  if (explanation.missingEvidenceReferenceId
    && !factsById.get(explanation.missingEvidenceReferenceId)?.missing) {
    throw invalidResponse('AI explanation marked available evidence as missing.');
  }

  validateText(explanation.summary, explanation.evidenceReferenceIds, allowedMoves);
  for (const tradeoff of explanation.tradeoffs) {
    validateText(tradeoff.text, tradeoff.evidenceReferenceIds, allowedMoves);
  }
  return explanation;
}

function validateText(
  text: string,
  referenceIds: readonly string[],
  allowedMoves: ReadonlySet<string>,
): void {
  if (/\b(i recommend|you should|you must|must play|choose this|pick this|the move to play|prefer this|reject this)\b/i.test(text)) {
    throw invalidResponse('AI explanation attempted to recommend a move.');
  }
  if (/\b(because|therefore|thereby|leads? to|causes?|results? in|allows?|prevents?|threatens?|forces?)\b/i.test(text)) {
    throw invalidResponse('AI explanation introduced an unsupported causal claim.');
  }

  const mentionedUci = text.match(/\b[a-h][1-8][a-h][1-8][qrbn]?\b/gi) ?? [];
  const mentionedSan = text.match(/\b(?:O-O(?:-O)?|[KQRBN][a-h1-8]?x?[a-h][1-8](?:=[QRBN])?[+#]?|[a-h](?:x[a-h])?[1-8](?:=[QRBN])?[+#]?)\b/g) ?? [];
  const mentionedMoves = [...mentionedUci, ...mentionedSan].map((move) => move.toLowerCase());
  if (mentionedMoves.some((move) => !allowedMoves.has(move))) {
    throw invalidResponse('AI explanation referenced an unsupported move.');
  }

  requireEvidenceForVocabulary(text, referenceIds, /\b(rank|ranked|ranking|higher|lower|order)\b/i, ['.rank']);
  requireEvidenceForVocabulary(text, referenceIds, /\b(engine|evaluation|score|depth|mate|centipawn)\b/i, ['.engine_']);
  requireEvidenceForVocabulary(text, referenceIds, /\b(population|target play|frequency|common|games)\b/i, ['.population_', '.masters_', '.personal_']);
  requireEvidenceForVocabulary(text, referenceIds, /\b(target fit|aligned|misaligned)\b/i, ['.target_fit']);
  requireEvidenceForVocabulary(text, referenceIds, /\b(profile fit|profile evidence)\b/i, ['.profile_fit', '.player_profile_']);
  requireEvidenceForVocabulary(text, referenceIds, /\b(course|covered|conflict|transposes?)\b/i, ['.course_']);
  requireEvidenceForVocabulary(text, referenceIds, /\b(opening)\b/i, ['.opening_']);
}

function requireEvidenceForVocabulary(
  text: string,
  referenceIds: readonly string[],
  vocabulary: RegExp,
  supportedFragments: readonly string[],
): void {
  if (!vocabulary.test(text)) return;
  if (!referenceIds.some((id) => supportedFragments.some((fragment) => id.includes(fragment)))) {
    throw invalidResponse('AI explanation made a claim without the matching authoritative evidence reference.');
  }
}

function collectReferencedFacts(
  explanation: AiBuilderCandidateExplanationContent,
  factsById: ReadonlyMap<string, AiBuilderCandidateExplanationFact>,
): AiBuilderCandidateExplanationFact[] {
  return [...new Set(collectReferenceIds(explanation))]
    .map((id) => factsById.get(id))
    .filter(isFact);
}

function collectReferenceIds(explanation: AiBuilderCandidateExplanationContent): string[] {
  return [
    ...explanation.evidenceReferenceIds,
    ...explanation.tradeoffs.flatMap((tradeoff) => tradeoff.evidenceReferenceIds),
    ...(explanation.missingEvidenceReferenceId ? [explanation.missingEvidenceReferenceId] : []),
  ];
}

function invalidResponse(message: string): AiFeatureError {
  return new AiFeatureError(502, 'AI_INVALID_RESPONSE', message);
}

function formatCentipawns(score: number): string {
  const pawns = score / 100;
  return `${pawns >= 0 ? '+' : ''}${pawns.toFixed(2)}`;
}

function formatPercent(value: number): string {
  return `${Math.round(value * 10) / 10}%`;
}

function humanize(value: string): string {
  return value
    .replaceAll('_', ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .replace(/^./, (letter) => letter.toUpperCase());
}

function isString(value: string | null | undefined): value is string {
  return typeof value === 'string';
}

function isFact(value: AiBuilderCandidateExplanationFact | undefined): value is AiBuilderCandidateExplanationFact {
  return value !== undefined;
}
