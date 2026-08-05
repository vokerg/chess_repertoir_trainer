import { Chess } from 'chess.js';
import { normalizeFenForPosition } from 'chess-domain';
import type {
  TrapOfferRole,
  TrapOutcome,
  TrapPilotRecord,
  TrapSetupSoundness,
  TrapSide,
} from './trap-pilot.types';

const retrievedAt = '2026-07-27T00:00:00.000Z';
const projectReport = 'north-star/repertoire-builder/reports/RB-014-2026-07-27-traps-foundation-discovery.md';
const fallbackFen = normalizeFenForPosition('startpos');

export interface TrapPilotCandidateInput {
  id: string;
  title: string;
  aliases?: readonly string[];
  familyId: string;
  side: TrapSide;
  soundness?: TrapSetupSoundness;
  opening?: { eco?: string; name?: string };
  setupMoves: readonly string[];
  offer: {
    moveUci: string;
    role: TrapOfferRole;
    explanation: string;
  };
  response: {
    id: string;
    movesUci: readonly string[];
    explanation: string;
  };
  punishment: {
    lineUci: readonly string[];
    outcome: TrapOutcome;
    explanation: string;
  };
  safeDefense: {
    moveUci: string;
    explanation: string;
  };
  summary: string;
  warnings?: readonly string[];
  discoveryRef: string;
}

function deriveTriggerFen(movesUci: readonly string[]): string {
  const chess = new Chess();
  try {
    for (const moveUci of movesUci) {
      const played = chess.move({
        from: moveUci.slice(0, 2),
        to: moveUci.slice(2, 4),
        promotion: moveUci.slice(4, 5) || undefined,
      });
      if (!played) return fallbackFen;
    }
    return normalizeFenForPosition(chess.fen());
  } catch {
    return fallbackFen;
  }
}

function missingEvidence(kind: 'engine' | 'population', id: string): TrapPilotRecord['evidence'][typeof kind] {
  return {
    status: 'MISSING',
    profile: kind === 'engine'
      ? { id: 'trap-pilot-stockfish', version: 'depth-24-multipv-3-v1' }
      : { id: 'lichess-games-explorer', version: 'product-speed-rating-presets-v1' },
    reason: `No ${kind} snapshot has been captured for candidate ${id}.`,
  };
}

export function trapPilotCandidate(input: TrapPilotCandidateInput): TrapPilotRecord {
  return {
    id: input.id,
    revision: 1,
    lifecycle: 'DRAFT',
    title: input.title,
    aliases: input.aliases ?? [],
    trapFamilyId: input.familyId,
    sideSettingTrap: input.side,
    setupSoundness: input.soundness ?? 'UNASSESSED',
    opening: input.opening,
    trigger: {
      normalizedFen: deriveTriggerFen(input.setupMoves),
      setupRoutes: [
        {
          id: 'main-reference-route',
          movesUci: input.setupMoves,
          sourceRef: input.discoveryRef,
        },
      ],
    },
    offer: input.offer,
    temptingResponses: [input.response],
    punishments: [
      {
        againstResponseId: input.response.id,
        ...input.punishment,
      },
    ],
    safeDefenses: [input.safeDefense],
    editorial: {
      summary: input.summary,
      warnings: [
        'This is a structurally reviewed DRAFT candidate; engine and population evidence remain mandatory.',
        ...(input.warnings ?? []),
      ],
      reviewState: 'NEEDS_EVIDENCE',
      reviewRationale: 'Conventional move sequence checked as a discovery reference and rewritten as project-original pilot data.',
    },
    provenance: [
      {
        sourceType: 'PROJECT_RESEARCH',
        sourceId: `rb-017-${input.id}`,
        sourceRef: projectReport,
        sourceVersion: 'rb-017-pilot-v1',
        license: 'PROJECT_ORIGINAL',
        retrievedAt,
      },
      {
        sourceType: 'DISCOVERY_REFERENCE',
        sourceId: input.discoveryRef,
        sourceRef: input.discoveryRef,
        sourceVersion: 'retrieved-2026-07-27',
        license: 'REFERENCE_ONLY',
        retrievedAt,
      },
    ],
    evidence: {
      engine: missingEvidence('engine', input.id),
      population: missingEvidence('population', input.id),
    },
  };
}
