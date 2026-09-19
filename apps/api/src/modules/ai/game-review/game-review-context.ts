import { Chess } from 'chess.js';
import type { AiGameReviewWarning } from '@chess-trainer/contracts/ai';
import type { ImportedGameDetail } from '@chess-trainer/contracts/imported-games';
import { OpeningLookupService } from '../../../services/opening-book/openingLookupService';
import type { OpeningBookEntry } from '../../../services/opening-book/openingBook.types';
import { OpeningClassificationService } from '../../../services/opening-book/openingClassificationService';
import {
  OPENING_KNOWLEDGE_VERSION,
  OpeningKnowledgeService,
} from '../../../services/opening-book/openingKnowledgeService';

const MAX_CONTEXT_PLIES = 300;
const OPENING_PLAN_LIMIT = 3;
const OPENING_QUALIFIER_LIMIT = 4;
const OPENING_RULE_REFERENCE_LIMIT = 12;

export interface GameReviewAnalysisMove {
  plyNumber: number;
  moveNumber: number;
  side: 'WHITE' | 'BLACK';
  playedMoveUci: string;
  playedMoveSan: string | null;
  classification: string | null;
  scoreLossCp: number | null;
  bestMoveUci: string | null;
  bestScoreCpWhite: number | null;
  playedScoreCpWhite: number | null;
  bestMateWhite: number | null;
}

export interface GameReviewAnalysisRun {
  id: number;
  status: string;
  completedAt: string | null;
  whiteAccuracy: number | null;
  blackAccuracy: number | null;
  whiteAverageCentipawnLoss: number | null;
  blackAverageCentipawnLoss: number | null;
  summary: unknown;
  moves: GameReviewAnalysisMove[];
}

export interface AuthoritativeReviewMove {
  plyNumber: number;
  moveNumber: number;
  side: 'WHITE' | 'BLACK';
  playedMoveSan: string | null;
  bestMoveSan: string | null;
  classification: string | null;
  scoreLossCp: number | null;
}

export interface GameReviewOpeningKnowledgeStatement {
  text: string;
  confidence: string;
}

export interface GameReviewOpeningKnowledgePlan {
  id: string;
  title: string;
  summary: string;
  conditions: string[];
  caveats: string[];
  confidence: string;
}

export interface GameReviewOpeningKnowledgeContext {
  status: 'AVAILABLE' | 'PARTIAL' | 'UNAVAILABLE';
  version: string;
  opening: { eco: string | null; name: string; source: string } | null;
  side: 'WHITE' | 'BLACK' | null;
  shortDescription: GameReviewOpeningKnowledgeStatement | null;
  strategicSummary: GameReviewOpeningKnowledgeStatement | null;
  plans: GameReviewOpeningKnowledgePlan[];
  matchedRuleIds: string[];
}

export interface GameReviewContextResult {
  context: Record<string, unknown>;
  authoritativeMoves: Map<number, AuthoritativeReviewMove>;
  openingKnowledge: GameReviewOpeningKnowledgeContext;
  openingKnowledgePlanIds: ReadonlySet<string>;
  warnings: AiGameReviewWarning[];
}

export function buildGameReviewContext(
  game: ImportedGameDetail,
  run: GameReviewAnalysisRun,
): GameReviewContextResult {
  if (!game.pgn) throw new Error('Game PGN is required');

  const chess = new Chess();
  try {
    chess.loadPgn(game.pgn);
  } catch {
    throw new Error('Could not parse imported game PGN');
  }

  const history = chess.history({ verbose: true }) as Array<{
    before: string;
    san: string;
    from: string;
    to: string;
    promotion?: string;
  }>;
  const uciMoves = history.map((move) => `${move.from}${move.to}${move.promotion ?? ''}`);
  const openingKnowledge = resolveOpeningKnowledge(game, uciMoves);
  const analysisByPly = new Map(run.moves.map((move) => [move.plyNumber, move]));
  const warnings = new Set<AiGameReviewWarning>();
  if (!openingKnowledge.identifiedOpening) warnings.add('OPENING_NOT_IDENTIFIED');
  if (history.length > MAX_CONTEXT_PLIES) warnings.add('INCOMPLETE_MOVE_DATA');
  if (run.moves.length < history.length) warnings.add('LIMITED_ENGINE_DATA');

  const authoritativeMoves = new Map<number, AuthoritativeReviewMove>();
  const moves = history.slice(0, MAX_CONTEXT_PLIES).map((move, index) => {
    const plyNumber = index + 1;
    const analysis = analysisByPly.get(plyNumber);
    if (!analysis) warnings.add('LIMITED_ENGINE_DATA');
    const side: 'WHITE' | 'BLACK' = plyNumber % 2 === 1 ? 'WHITE' : 'BLACK';
    const bestMoveSan = analysis?.bestMoveUci ? sanForUci(move.before, analysis.bestMoveUci) : null;
    const authoritative: AuthoritativeReviewMove = {
      plyNumber,
      moveNumber: Math.ceil(plyNumber / 2),
      side,
      playedMoveSan: move.san || analysis?.playedMoveSan || null,
      bestMoveSan,
      classification: analysis?.classification ?? null,
      scoreLossCp: analysis?.scoreLossCp ?? null,
    };
    authoritativeMoves.set(plyNumber, authoritative);

    return {
      ...authoritative,
      playedMoveUci: uciMoves[index],
      bestMoveUci: analysis?.bestMoveUci ?? null,
      bestScoreCpWhite: analysis?.bestScoreCpWhite ?? null,
      playedScoreCpWhite: analysis?.playedScoreCpWhite ?? null,
      bestMateWhite: analysis?.bestMateWhite ?? null,
    };
  });

  const userAccuracy = game.userColor === 'BLACK' ? run.blackAccuracy : run.whiteAccuracy;

  return {
    context: {
      game: {
        userColor: game.userColor,
        resultForUser: game.resultForUser,
        speedCategory: game.speedCategory,
        rated: game.rated,
        timeControl: game.timeControl,
        opening: game.opening,
        white: game.white,
        black: game.black,
        opponentUsername: game.opponentUsername,
        deterministicTags: game.tags.map((tag) => tag.name),
      },
      openingKnowledge: openingKnowledge.context,
      analysis: {
        userAccuracy,
        whiteAccuracy: run.whiteAccuracy,
        blackAccuracy: run.blackAccuracy,
        whiteAverageCentipawnLoss: run.whiteAverageCentipawnLoss,
        blackAverageCentipawnLoss: run.blackAverageCentipawnLoss,
        classificationSummary: run.summary,
      },
      moves,
    },
    authoritativeMoves,
    openingKnowledge: openingKnowledge.context,
    openingKnowledgePlanIds: openingKnowledge.planIds,
    warnings: [...warnings],
  };
}

function resolveOpeningKnowledge(
  game: ImportedGameDetail,
  uciMoves: readonly string[],
): {
  context: GameReviewOpeningKnowledgeContext;
  identifiedOpening: boolean;
  planIds: ReadonlySet<string>;
} {
  const moveMatch = uciMoves.length ? OpeningLookupService.lookupByMoves([...uciMoves]) : null;
  const storedEntry = storedOpeningEntry(game, uciMoves);
  const entry = moveMatch ?? storedEntry;
  if (!entry) {
    return {
      context: unavailableOpeningKnowledge(game.userColor, null),
      identifiedOpening: false,
      planIds: new Set(),
    };
  }

  const classification = OpeningClassificationService.classify(entry);
  const knowledge = OpeningKnowledgeService.resolve(entry, classification);
  const selected = game.userColor === 'WHITE'
    ? knowledge.white
    : game.userColor === 'BLACK'
      ? knowledge.black
      : null;
  const plans = (selected?.plans ?? []).slice(0, OPENING_PLAN_LIMIT).map((plan) => ({
    id: plan.id,
    title: plan.title,
    summary: plan.summary,
    conditions: [...(plan.conditions ?? [])].slice(0, OPENING_QUALIFIER_LIMIT),
    caveats: [...(plan.caveats ?? [])].slice(0, OPENING_QUALIFIER_LIMIT),
    confidence: plan.confidence,
  }));
  const shortDescription = knowledge.shortDescription ? {
    text: knowledge.shortDescription.text,
    confidence: knowledge.shortDescription.confidence,
  } : null;
  const strategicSummary = selected?.strategicSummary ? {
    text: selected.strategicSummary.text,
    confidence: selected.strategicSummary.confidence,
  } : null;
  const hasApplicableKnowledge = Boolean(
    game.userColor
    && knowledge.matchedKnowledgeRuleIds.length
    && (shortDescription || strategicSummary || plans.length),
  );
  const status = hasApplicableKnowledge ? knowledge.status : 'UNAVAILABLE';

  return {
    context: {
      status,
      version: knowledge.knowledgeVersion,
      opening: {
        eco: entry.eco || null,
        name: entry.name,
        source: moveMatch?.source ?? 'STORED_GAME',
      },
      side: game.userColor,
      shortDescription: hasApplicableKnowledge ? shortDescription : null,
      strategicSummary: hasApplicableKnowledge ? strategicSummary : null,
      plans: hasApplicableKnowledge ? plans : [],
      matchedRuleIds: hasApplicableKnowledge
        ? [...knowledge.matchedKnowledgeRuleIds].slice(0, OPENING_RULE_REFERENCE_LIMIT)
        : [],
    },
    identifiedOpening: true,
    planIds: new Set(hasApplicableKnowledge ? plans.map((plan) => plan.id) : []),
  };
}

function storedOpeningEntry(
  game: ImportedGameDetail,
  uciMoves: readonly string[],
): OpeningBookEntry | null {
  if (!game.opening.eco && !game.opening.name) return null;
  const ecoMatch = game.opening.eco ? OpeningLookupService.lookupByEco(game.opening.eco) : null;
  if (ecoMatch && (!game.opening.name || ecoMatch.name === game.opening.name)) return ecoMatch;
  return {
    eco: game.opening.eco ?? '',
    name: game.opening.name ?? ecoMatch?.name ?? game.opening.eco ?? 'Unknown opening',
    pgn: '',
    uci: uciMoves.join(' '),
    epd: '',
    ply: uciMoves.length,
  };
}

function unavailableOpeningKnowledge(
  side: 'WHITE' | 'BLACK' | null,
  opening: { eco: string | null; name: string; source: string } | null,
): GameReviewOpeningKnowledgeContext {
  return {
    status: 'UNAVAILABLE',
    version: OPENING_KNOWLEDGE_VERSION,
    opening,
    side,
    shortDescription: null,
    strategicSummary: null,
    plans: [],
    matchedRuleIds: [],
  };
}

function sanForUci(fen: string, uci: string): string | null {
  try {
    const chess = new Chess(fen);
    const move = chess.move({
      from: uci.substring(0, 2),
      to: uci.substring(2, 4),
      promotion: uci.substring(4, 5) || undefined,
    });
    return move?.san ?? null;
  } catch {
    return null;
  }
}
