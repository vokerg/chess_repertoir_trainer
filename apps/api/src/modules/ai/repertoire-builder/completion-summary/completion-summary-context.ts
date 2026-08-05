import type {
  AiBuilderCompletionSummaryAuthoritativeResult,
  AiBuilderCompletionSummaryContent,
  AiBuilderCompletionSummaryDestination,
  AiBuilderCompletionSummaryFact,
  AiBuilderCompletionSummaryRequest,
} from '@chess-trainer/contracts/ai';
import type { BuilderCourseDraft } from '@chess-trainer/contracts/courses';
import { AiFeatureError } from '../../ai.errors';

const MAX_PATH_FACTS = 6;
const MAX_EXCLUDED_FACTS = 6;

export interface CompletionSummaryContext {
  facts: AiBuilderCompletionSummaryFact[];
  authoritativeResult: AiBuilderCompletionSummaryAuthoritativeResult;
  referencedFacts(summary: AiBuilderCompletionSummaryContent): AiBuilderCompletionSummaryFact[];
  reconcile(summary: AiBuilderCompletionSummaryContent): AiBuilderCompletionSummaryContent;
}

export function buildCompletionSummaryContext(
  request: AiBuilderCompletionSummaryRequest,
  destination: AiBuilderCompletionSummaryDestination,
): CompletionSummaryContext {
  const authoritativeResult = toAuthoritativeResult(request, destination);
  const facts = buildFacts(request, authoritativeResult);
  const factsById = new Map(facts.map((fact) => [fact.id, fact]));
  const allowedMoves = collectAllowedMoves(request.draft);

  return {
    facts,
    authoritativeResult,
    referencedFacts: (summary) => collectReferencedFacts(summary, factsById),
    reconcile: (summary) => reconcileSummary(summary, factsById, allowedMoves),
  };
}

function toAuthoritativeResult(
  request: AiBuilderCompletionSummaryRequest,
  destination: AiBuilderCompletionSummaryDestination,
): AiBuilderCompletionSummaryAuthoritativeResult {
  const result = request.applyResult;
  const factualSummary = result.idempotent
    ? `${result.lineName} in ${destination.courseName} · ${destination.chapterName} already matched this draft; ${result.reusedMoves} moves were reused at course revision ${result.courseContentRevision}.`
    : `${result.lineName} in ${destination.courseName} · ${destination.chapterName} was updated with ${result.createdMoves} created and ${result.reusedMoves} reused moves at course revision ${result.courseContentRevision}.`;

  return {
    courseId: result.courseId,
    courseName: destination.courseName,
    chapterId: result.chapterId,
    chapterName: destination.chapterName,
    lineId: result.lineId,
    lineName: result.lineName,
    targetKind: result.targetKind,
    createdMoves: result.createdMoves,
    reusedMoves: result.reusedMoves,
    skippedBranches: result.skippedBranches,
    totalDraftMoves: result.totalDraftMoves,
    courseContentRevision: result.courseContentRevision,
    idempotent: result.idempotent,
    factualSummary,
  };
}

function buildFacts(
  request: AiBuilderCompletionSummaryRequest,
  result: AiBuilderCompletionSummaryAuthoritativeResult,
): AiBuilderCompletionSummaryFact[] {
  const facts: AiBuilderCompletionSummaryFact[] = [
    fact('result.destination', 'Applied destination', `${result.courseName} · ${result.chapterName}`),
    fact('result.line', 'Applied line', `${result.lineName} (line ${result.lineId})`),
    fact('result.target_kind', 'Target kind', humanize(result.targetKind)),
    fact('result.created_moves', 'Created moves', String(result.createdMoves)),
    fact('result.reused_moves', 'Reused moves', String(result.reusedMoves)),
    fact('result.skipped_branches', 'Excluded branches', String(result.skippedBranches)),
    fact('result.total_moves', 'Materialized moves', String(result.totalDraftMoves)),
    fact('result.revision', 'Course content revision', String(result.courseContentRevision)),
    fact('result.idempotent', 'Idempotent result', result.idempotent ? 'Yes' : 'No'),
    fact('draft.session', 'Builder session', `${request.draft.sessionId} revision ${request.draft.sessionRevision}`),
    fact('draft.target', 'Repertoire target', `${request.draft.targetId} revision ${request.draft.targetRevision}`),
    fact('draft.materialized_decisions', 'Materialized decisions', String(request.draft.materializedDecisionCount)),
    fact('draft.transposition_leaves', 'Transposition leaves', String(request.draft.transpositionLeafCount)),
  ];

  collectLeafPaths(request.draft)
    .slice(0, MAX_PATH_FACTS)
    .forEach((path, index) => facts.push(fact(
      `path.${index + 1}`,
      `Applied path ${index + 1}`,
      path.join(' '),
    )));

  request.draft.excludedBranches
    .slice(0, MAX_EXCLUDED_FACTS)
    .forEach((branch, index) => facts.push(fact(
      `excluded.${index + 1}`,
      `Excluded branch ${index + 1}`,
      `${branch.branchId} · ${branch.pathUci.join(' ') || 'root'} · ${humanize(branch.status)} · ${humanize(branch.reason)}`,
    )));

  return facts;
}

function reconcileSummary(
  summary: AiBuilderCompletionSummaryContent,
  factsById: ReadonlyMap<string, AiBuilderCompletionSummaryFact>,
  allowedMoves: ReadonlySet<string>,
): AiBuilderCompletionSummaryContent {
  for (const referenceId of collectReferenceIds(summary)) {
    if (!factsById.has(referenceId)) {
      throw invalidResponse('AI completion summary referenced unsupported evidence.');
    }
  }

  validateText(summary.interpretation, summary.interpretationReferenceIds, allowedMoves);
  for (const item of summary.highlights) validateText(item.text, item.evidenceReferenceIds, allowedMoves);
  for (const item of summary.studyChecklist) validateText(item.text, item.evidenceReferenceIds, allowedMoves);
  if (summary.unresolvedWorkNote) {
    validateText(summary.unresolvedWorkNote.text, summary.unresolvedWorkNote.evidenceReferenceIds, allowedMoves);
    if (!summary.unresolvedWorkNote.evidenceReferenceIds.some((id) => (
      id.startsWith('excluded.') || id === 'result.skipped_branches'
    ))) {
      throw invalidResponse('Unresolved-work notes must reference excluded authoritative work.');
    }
  }
  if (summary.warning) {
    validateText(summary.warning.text, summary.warning.evidenceReferenceIds, allowedMoves);
    if (!summary.warning.evidenceReferenceIds.some((id) => (
      id === 'result.idempotent'
      || id === 'result.skipped_branches'
      || id === 'draft.transposition_leaves'
      || id.startsWith('excluded.')
    ))) {
      throw invalidResponse('AI completion warning was not grounded in a supported warning fact.');
    }
  }
  return summary;
}

function validateText(
  text: string,
  referenceIds: readonly string[],
  allowedMoves: ReadonlySet<string>,
): void {
  if (/\b(apply|write|merge|rename|relocate|choose the destination|change the destination|select the target)\b/i.test(text)) {
    throw invalidResponse('AI completion summary attempted to control course-writing behavior.');
  }
  if (/\b(because|therefore|thereby|leads? to|causes?|results? in|threatens?|forces?|winning|losing|best move|tactic|attack|defen[cs]e)\b/i.test(text)) {
    throw invalidResponse('AI completion summary introduced an unsupported chess or causal claim.');
  }
  if (
    /\b(excluded|deferred|ignored|stale|pending|unresolved)\b[^.]{0,50}\b(?:was|were|is|are)?\s*(applied|written|created|included)\b/i.test(text)
    || /\b(applied|written|created|included)\b[^.]{0,50}\b(excluded|deferred|ignored|stale|pending|unresolved)\b/i.test(text)
  ) {
    throw invalidResponse('AI completion summary claimed excluded work was applied.');
  }

  const mentionedMoves = text.match(/\b[a-h][1-8][a-h][1-8][qrbn]?\b/gi) ?? [];
  if (mentionedMoves.some((move) => !allowedMoves.has(move.toLowerCase()))) {
    throw invalidResponse('AI completion summary referenced an unsupported move.');
  }

  requireEvidenceForVocabulary(text, referenceIds, /\b(course|chapter|destination)\b/i, ['result.destination']);
  requireEvidenceForVocabulary(text, referenceIds, /\b(line)\b/i, ['result.line']);
  requireEvidenceForVocabulary(text, referenceIds, /\b(created|create count)\b/i, ['result.created_moves']);
  requireEvidenceForVocabulary(text, referenceIds, /\b(reused|reuse count)\b/i, ['result.reused_moves']);
  requireEvidenceForVocabulary(text, referenceIds, /\b(revision)\b/i, ['result.revision']);
  requireEvidenceForVocabulary(text, referenceIds, /\b(already matched|idempotent)\b/i, ['result.idempotent']);
  requireEvidenceForVocabulary(
    text,
    referenceIds,
    /\b(excluded|deferred|ignored|stale|pending|unresolved|skipped)\b/i,
    ['result.skipped_branches', 'excluded.'],
  );
}

function requireEvidenceForVocabulary(
  text: string,
  referenceIds: readonly string[],
  vocabulary: RegExp,
  supportedFragments: readonly string[],
): void {
  if (!vocabulary.test(text)) return;
  if (!referenceIds.some((id) => supportedFragments.some((fragment) => id.includes(fragment)))) {
    throw invalidResponse('AI completion summary made a claim without the matching authoritative evidence reference.');
  }
}

function collectReferencedFacts(
  summary: AiBuilderCompletionSummaryContent,
  factsById: ReadonlyMap<string, AiBuilderCompletionSummaryFact>,
): AiBuilderCompletionSummaryFact[] {
  return [...new Set(collectReferenceIds(summary))]
    .map((id) => factsById.get(id))
    .filter(isFact);
}

function collectReferenceIds(summary: AiBuilderCompletionSummaryContent): string[] {
  return [
    ...summary.interpretationReferenceIds,
    ...summary.highlights.flatMap((item) => item.evidenceReferenceIds),
    ...summary.studyChecklist.flatMap((item) => item.evidenceReferenceIds),
    ...(summary.unresolvedWorkNote?.evidenceReferenceIds ?? []),
    ...(summary.warning?.evidenceReferenceIds ?? []),
  ];
}

function collectLeafPaths(draft: BuilderCourseDraft): string[][] {
  const paths: string[][] = [];
  const visit = (moves: BuilderCourseDraft['analysisTree']['children'], prefix: string[]): void => {
    for (const move of moves) {
      const next = [...prefix, move.moveUci];
      if (move.children.length === 0) paths.push(next);
      else visit(move.children, next);
    }
  };
  visit(draft.analysisTree.children, []);
  return paths;
}

function collectAllowedMoves(draft: BuilderCourseDraft): Set<string> {
  const values = new Set<string>();
  const visit = (moves: BuilderCourseDraft['analysisTree']['children']): void => {
    for (const move of moves) {
      values.add(move.moveUci.toLowerCase());
      visit(move.children);
    }
  };
  visit(draft.analysisTree.children);
  for (const branch of draft.excludedBranches) {
    for (const move of branch.pathUci) values.add(move.toLowerCase());
  }
  return values;
}

function fact(id: string, label: string, value: string): AiBuilderCompletionSummaryFact {
  return { id, label, value };
}

function humanize(value: string): string {
  return value
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/^./, (letter) => letter.toUpperCase());
}

function invalidResponse(message: string): AiFeatureError {
  return new AiFeatureError(502, 'AI_INVALID_RESPONSE', message);
}

function isFact(value: AiBuilderCompletionSummaryFact | undefined): value is AiBuilderCompletionSummaryFact {
  return value !== undefined;
}