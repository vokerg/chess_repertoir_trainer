import { TRAP_PILOT_CANDIDATE_RECORDS } from './trap-pilot.candidates';
import type { TrapPilotDataset, TrapPilotRecord } from './trap-pilot.types';

const reportRef = 'north-star/repertoire-builder/reports/RB-014-2026-07-27-traps-foundation-discovery.md';
const sourceVersion = 'rb-014-2026-07-27';
const retrievedAt = '2026-07-27T00:00:00.000Z';

function missingEngineEvidence(reason: string): TrapPilotRecord['evidence']['engine'] {
  return {
    status: 'MISSING',
    profile: {
      id: 'trap-pilot-stockfish',
      version: 'depth-24-multipv-3-v1',
    },
    reason,
  };
}

function missingPopulationEvidence(reason: string): TrapPilotRecord['evidence']['population'] {
  return {
    status: 'MISSING',
    profile: {
      id: 'lichess-games-explorer',
      version: 'product-speed-rating-presets-v1',
    },
    reason,
  };
}

export const TRAP_PILOT_DATASET: TrapPilotDataset = {
  schemaVersion: 1,
  datasetVersion: '2026-07-pilot-v2',
  stage: 'PILOT',
  records: [
    {
      id: 'legal-trap-philidor-route-v1',
      revision: 1,
      lifecycle: 'DRAFT',
      title: 'Légal trap seed occurrence',
      aliases: ['Légal trap'],
      trapFamilyId: 'legal-trap-family',
      sideSettingTrap: 'WHITE',
      setupSoundness: 'UNASSESSED',
      trigger: {
        normalizedFen: 'rn1qkbnr/ppp2p1p/3p2p1/4N3/2B1P1b1/2N5/PPPP1PPP/R1BQK2R b KQkq -',
        setupRoutes: [
          {
            id: 'philidor-g6-route',
            movesUci: [
              'e2e4', 'e7e5', 'g1f3', 'd7d6', 'f1c4', 'c8g4', 'b1c3', 'g7g6', 'f3e5',
            ],
            sourceRef: `${reportRef}#1-légal-trap--sound-punishment-after-a-defensive-mistake`,
          },
        ],
      },
      offer: {
        moveUci: 'f3e5',
        role: 'SACRIFICE',
        explanation: 'White permits the apparent queen capture while threatening a forcing attack.',
      },
      temptingResponses: [
        {
          id: 'capture-white-queen',
          movesUci: ['g4d1'],
          explanation: 'Black accepts the apparent material gain by capturing the queen-side rook line endpoint on d1.',
        },
      ],
      punishments: [
        {
          againstResponseId: 'capture-white-queen',
          lineUci: ['c4f7', 'e8e7', 'c3d5'],
          outcome: 'MATE',
          explanation: 'White uses checks and the coordinated knights to finish the king attack.',
        },
      ],
      safeDefenses: [
        {
          moveUci: 'd6e5',
          explanation: 'Black declines the material temptation and removes the advanced knight.',
        },
      ],
      editorial: {
        summary: 'Seed record used to prove that the offer move, tempting response, punishment, and safe defense are separate concepts.',
        warnings: [
          'The exact setup soundness and target-population relevance require reproducible evidence snapshots.',
          'Only this concrete legal occurrence is represented; the broader named family may contain other move orders.',
        ],
        reviewState: 'NEEDS_EVIDENCE',
        reviewRationale: 'Structurally suitable seed; engine and population evidence are intentionally absent.',
      },
      provenance: [
        {
          sourceType: 'PROJECT_RESEARCH',
          sourceId: 'rb-014-legal-seed',
          sourceRef: reportRef,
          sourceVersion,
          license: 'PROJECT_ORIGINAL',
          retrievedAt,
        },
      ],
      evidence: {
        engine: missingEngineEvidence('No engine snapshot has been captured for the seed occurrence.'),
        population: missingPopulationEvidence('No authenticated Explorer snapshot has been captured for the seed occurrence.'),
      },
    },
    {
      id: 'blackburne-shilling-main-bait-v1',
      revision: 1,
      lifecycle: 'DRAFT',
      title: 'Blackburne–Shilling seed occurrence',
      aliases: ['Blackburne–Shilling trap'],
      trapFamilyId: 'blackburne-shilling-family',
      sideSettingTrap: 'BLACK',
      setupSoundness: 'DUBIOUS',
      trigger: {
        normalizedFen: 'r1bqkbnr/pppp1ppp/8/4p3/2BnP3/5N2/PPPP1PPP/RNBQK2R w KQkq -',
        setupRoutes: [
          {
            id: 'italian-nd4-route',
            movesUci: ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1c4', 'c6d4'],
            sourceRef: `${reportRef}#2-blackburneshilling--effective-trap-with-a-dubious-setup`,
          },
        ],
      },
      offer: {
        moveUci: 'c6d4',
        role: 'BAIT',
        explanation: 'Black places the knight on d4 and invites White to take the e5 pawn.',
      },
      temptingResponses: [
        {
          id: 'take-e5-pawn',
          movesUci: ['f3e5'],
          explanation: 'White accepts the apparently free central pawn and enters the tactical branch.',
        },
      ],
      punishments: [
        {
          againstResponseId: 'take-e5-pawn',
          lineUci: ['d8g5', 'e5f7', 'g5g2', 'h1f1', 'g2e4', 'c4e2', 'd4f3'],
          outcome: 'MATE',
          explanation: 'The illustrative cooperative line demonstrates the mating mechanism after further inaccurate play.',
        },
      ],
      safeDefenses: [
        {
          moveUci: 'c2c3',
          explanation: 'White challenges the advanced knight instead of entering the pawn-capture branch.',
        },
      ],
      editorial: {
        summary: 'Seed record used to keep practical temptation and conditional punishment separate from the objective quality of the setup.',
        warnings: [
          'The setup is provisionally marked dubious from editorial research, not from a stored pilot engine snapshot.',
          'The mating line requires additional cooperation and must not be presented as forced immediately after the first tempting response.',
        ],
        reviewState: 'NEEDS_EVIDENCE',
        reviewRationale: 'Strong model challenge because folklore value and setup soundness may diverge.',
      },
      provenance: [
        {
          sourceType: 'PROJECT_RESEARCH',
          sourceId: 'rb-014-blackburne-shilling-seed',
          sourceRef: reportRef,
          sourceVersion,
          license: 'PROJECT_ORIGINAL',
          retrievedAt,
        },
      ],
      evidence: {
        engine: missingEngineEvidence('The provisional DUBIOUS label still requires a versioned engine snapshot.'),
        population: missingPopulationEvidence('The practical frequency of the tempting move is not yet measured.'),
      },
    },
    {
      id: 'fishing-pole-ruy-lopez-route-v1',
      revision: 1,
      lifecycle: 'DRAFT',
      title: 'Fishing Pole seed occurrence',
      aliases: ['Fishing Pole trap'],
      trapFamilyId: 'fishing-pole-family',
      sideSettingTrap: 'BLACK',
      setupSoundness: 'UNASSESSED',
      trigger: {
        normalizedFen: 'r1bqkb1r/pppp1pp1/2n5/1B2p2p/4P1n1/5N1P/PPPP1PP1/RNBQ1RK1 w kq -',
        setupRoutes: [
          {
            id: 'ruy-lopez-h5-route',
            movesUci: ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1b5', 'g8f6', 'e1g1', 'f6g4', 'h2h3', 'h7h5'],
            sourceRef: `${reportRef}#3-fishing-pole--family-and-move-order-complexity`,
          },
        ],
      },
      offer: {
        moveUci: 'h7h5',
        role: 'SACRIFICE',
        explanation: 'Black offers the g4 knight to open the h-file and gain attacking tempi.',
      },
      temptingResponses: [
        {
          id: 'capture-g4-knight',
          movesUci: ['h3g4'],
          explanation: 'White accepts the offered knight and opens the h-file structure.',
        },
      ],
      punishments: [
        {
          againstResponseId: 'capture-g4-knight',
          lineUci: ['h5g4'],
          outcome: 'POSITIONAL_BIND',
          explanation: 'The first forcing response opens the h-file; deeper attacking claims remain evidence-dependent.',
        },
      ],
      safeDefenses: [
        {
          moveUci: 'd2d4',
          explanation: 'White declines the capture and contests the center while retaining defensive options.',
        },
      ],
      editorial: {
        summary: 'Seed record used to test family grouping, normalized en-passant identity, and non-mating practical consequences.',
        warnings: [
          'Related Fishing Pole ideas from non-identical positions must not be collapsed into this occurrence.',
          'The POSITIONAL_BIND outcome is provisional and may be downgraded or rejected after engine and population review.',
        ],
        reviewState: 'NEEDS_EVIDENCE',
        reviewRationale: 'Useful stress case for move-order, identity, defensive-resource, and outcome classification rules.',
      },
      provenance: [
        {
          sourceType: 'PROJECT_RESEARCH',
          sourceId: 'rb-014-fishing-pole-seed',
          sourceRef: reportRef,
          sourceVersion,
          license: 'PROJECT_ORIGINAL',
          retrievedAt,
        },
      ],
      evidence: {
        engine: missingEngineEvidence('No engine snapshot has established the setup or continuation classification.'),
        population: missingPopulationEvidence('No speed/rating population snapshot has established practical temptation.'),
      },
    },
    ...TRAP_PILOT_CANDIDATE_RECORDS,
  ],
};
