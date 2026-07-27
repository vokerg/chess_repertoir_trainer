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

interface CandidateInput {
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

function playUci(chess: Chess, moveUci: string): void {
  const move = chess.move({
    from: moveUci.slice(0, 2),
    to: moveUci.slice(2, 4),
    promotion: moveUci.slice(4, 5) || undefined,
  });
  if (!move) throw new Error(`Illegal candidate move ${moveUci}.`);
}

function deriveTriggerFen(movesUci: readonly string[]): string {
  const chess = new Chess();
  for (const moveUci of movesUci) playUci(chess, moveUci);
  return normalizeFenForPosition(chess.fen());
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

function candidate(input: CandidateInput): TrapPilotRecord {
  if (input.setupMoves.at(-1) !== input.offer.moveUci) {
    throw new Error(`Candidate ${input.id} setup route must end with its offer move.`);
  }
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

export const TRAP_PILOT_CANDIDATE_RECORDS: readonly TrapPilotRecord[] = [
  candidate({
    id: 'scholars-mate-qh5-v1',
    title: "Scholar's mate candidate",
    aliases: ["Scholar's mate"],
    familyId: 'scholars-mate-family',
    side: 'WHITE',
    soundness: 'PLAYABLE_RISK',
    opening: { eco: 'C20', name: "King's Pawn Game" },
    setupMoves: ['e2e4', 'e7e5', 'f1c4', 'b8c6', 'd1h5'],
    offer: {
      moveUci: 'd1h5',
      role: 'BAIT',
      explanation: 'White creates the direct Qxf7 mate threat and invites a natural developing move that ignores it.',
    },
    response: {
      id: 'ignore-f7-threat',
      movesUci: ['g8f6'],
      explanation: 'Black develops the knight but leaves f7 undefended against the queen and bishop.',
    },
    punishment: {
      lineUci: ['h5f7'],
      outcome: 'MATE',
      explanation: 'Qxf7 is checkmate in the concrete position.',
    },
    safeDefense: {
      moveUci: 'g7g6',
      explanation: 'Black attacks the queen and prevents the immediate mating capture.',
    },
    summary: 'A minimal mate threat candidate used to validate one-move temptation and punishment.',
    discoveryRef: 'https://en.wikipedia.org/wiki/Scholar%27s_mate',
  }),
  candidate({
    id: 'fools-mate-e5-v1',
    title: "Fool's mate candidate",
    aliases: ["Fool's mate"],
    familyId: 'fools-mate-family',
    side: 'BLACK',
    soundness: 'SOUND',
    opening: { eco: 'A00', name: 'Irregular opening sequence' },
    setupMoves: ['f2f3', 'e7e5'],
    offer: {
      moveUci: 'e7e5',
      role: 'TACTICAL_PERMISSION',
      explanation: 'Black opens the queen diagonal while White has already weakened the king.',
    },
    response: {
      id: 'weaken-g-pawn',
      movesUci: ['g2g4'],
      explanation: 'White opens the h4-e1 diagonal completely.',
    },
    punishment: {
      lineUci: ['d8h4'],
      outcome: 'MATE',
      explanation: 'Qh4 is immediate checkmate.',
    },
    safeDefense: {
      moveUci: 'e2e4',
      explanation: 'White occupies the centre without opening the mating diagonal further.',
    },
    summary: 'A baseline forced-mate occurrence with no material bait.',
    discoveryRef: 'https://en.wikipedia.org/wiki/Fool%27s_mate',
  }),
  candidate({
    id: 'englund-qb2-mate-v1',
    title: 'Englund Gambit queen-side mate candidate',
    aliases: ['Englund Gambit trap'],
    familyId: 'englund-gambit-trap-family',
    side: 'BLACK',
    soundness: 'DUBIOUS',
    opening: { eco: 'A40', name: 'Englund Gambit' },
    setupMoves: ['d2d4', 'e7e5', 'd4e5', 'b8c6', 'g1f3', 'd8e7', 'c1f4', 'e7b4', 'f4d2', 'b4b2'],
    offer: {
      moveUci: 'b4b2',
      role: 'BAIT',
      explanation: 'Black takes b2 and invites the bishop to attack the queen.',
    },
    response: {
      id: 'chase-queen-with-bishop',
      movesUci: ['d2c3'],
      explanation: 'White develops with tempo but blocks the c-file mating square structure.',
    },
    punishment: {
      lineUci: ['f8b4', 'd1d2', 'b4c3', 'd2c3', 'b2c1'],
      outcome: 'MATE',
      explanation: 'The bishop deflection allows Qc1 mate after the queen recapture.',
    },
    safeDefense: {
      moveUci: 'b1c3',
      explanation: 'White develops the knight and protects the rook without entering the mating pattern.',
    },
    summary: 'A dubious-opening candidate that requires a precise distinction between practical trap value and objective soundness.',
    discoveryRef: 'https://www.chessreps.com/opening/englund-gambit',
  }),
  candidate({
    id: 'siberian-ng4-v1',
    title: 'Siberian Trap candidate',
    aliases: ['Siberian Trap'],
    familyId: 'siberian-trap-family',
    side: 'BLACK',
    soundness: 'PLAYABLE_RISK',
    opening: { eco: 'B20', name: 'Smith–Morra Gambit' },
    setupMoves: ['e2e4', 'c7c5', 'd2d4', 'c5d4', 'c2c3', 'd4c3', 'b1c3', 'b8c6', 'g1f3', 'e7e6', 'f1c4', 'd8c7', 'e1g1', 'g8f6', 'd1e2', 'f6g4'],
    offer: {
      moveUci: 'f6g4',
      role: 'BAIT',
      explanation: 'Black places the knight near h2 and invites a routine pawn chase.',
    },
    response: {
      id: 'chase-g4-knight',
      movesUci: ['h2h3'],
      explanation: 'White attacks the knight but overlooks the d4 deflection and h2 mating route.',
    },
    punishment: {
      lineUci: ['c6d4', 'f3d4', 'c7h2'],
      outcome: 'MATE',
      explanation: 'The knight deflection clears Qh2 mate.',
    },
    safeDefense: {
      moveUci: 'c3b5',
      explanation: 'White creates counterplay against c7 instead of weakening h2.',
    },
    summary: 'A multi-move tactical trap with a natural pawn-chase temptation.',
    discoveryRef: 'https://en.wikipedia.org/wiki/Sicilian_Defence%2C_Smith%E2%80%93Morra_Gambit%2C_Siberian_Trap',
  }),
  candidate({
    id: 'kieninger-smothered-mate-v1',
    title: 'Kieninger Trap candidate',
    aliases: ['Kieninger Trap'],
    familyId: 'kieninger-trap-family',
    side: 'BLACK',
    soundness: 'PLAYABLE_RISK',
    opening: { eco: 'A52', name: 'Budapest Gambit' },
    setupMoves: ['d2d4', 'g8f6', 'c2c4', 'e7e5', 'd4e5', 'f6g4', 'c1f4', 'b8c6', 'g1f3', 'f8b4', 'b1d2', 'd8e7', 'a2a3', 'g4e5'],
    offer: {
      moveUci: 'g4e5',
      role: 'TACTICAL_PERMISSION',
      explanation: 'Black recovers the pawn while apparently leaving the b4 bishop en prise.',
    },
    response: {
      id: 'capture-b4-bishop',
      movesUci: ['a3b4'],
      explanation: 'White takes the bishop but removes the a-pawn guard from the d3 mating square pattern.',
    },
    punishment: {
      lineUci: ['e5d3'],
      outcome: 'MATE',
      explanation: 'Nd3 is smothered mate.',
    },
    safeDefense: {
      moveUci: 'f3e5',
      explanation: 'White exchanges the active knight instead of taking the bishop immediately.',
    },
    summary: 'A one-move smothered-mate candidate that stresses legal side-to-move identity.',
    discoveryRef: 'https://en.wikipedia.org/wiki/Budapest_Gambit#Kieninger_Trap',
  }),
  candidate({
    id: 'tennison-queen-skewer-v1',
    title: 'Tennison Gambit queen-skewer candidate',
    aliases: ['Tennison Gambit ICBM pattern'],
    familyId: 'tennison-gambit-family',
    side: 'WHITE',
    soundness: 'DUBIOUS',
    opening: { eco: 'A06', name: 'Tennison Gambit' },
    setupMoves: ['g1f3', 'd7d5', 'e2e4', 'd5e4', 'f3g5', 'g8f6', 'd2d3', 'e4d3', 'f1d3', 'h7h6', 'g5f7'],
    offer: {
      moveUci: 'g5f7',
      role: 'SACRIFICE',
      explanation: 'White forks queen and rook and invites the king to capture the knight.',
    },
    response: {
      id: 'king-captures-f7',
      movesUci: ['e8f7'],
      explanation: 'Black accepts the knight and steps onto the bishop-check line.',
    },
    punishment: {
      lineUci: ['d3g6', 'f7g6', 'd1d8'],
      outcome: 'MATERIAL',
      explanation: 'The bishop sacrifice deflects the king and allows White to take the queen.',
    },
    safeDefense: {
      moveUci: 'd8d5',
      explanation: 'Black moves the attacked queen instead of accepting the sacrificial knight.',
    },
    summary: 'A dubious gambit candidate used to test sacrifice chains ending in a queen loss rather than mate.',
    discoveryRef: 'https://en.wikipedia.org/wiki/Tennison_Gambit',
  }),
  candidate({
    id: 'damiano-nxe5-v1',
    title: 'Damiano Defence king-exposure candidate',
    aliases: ['Damiano Defence trap'],
    familyId: 'damiano-defence-trap-family',
    side: 'WHITE',
    soundness: 'SOUND',
    opening: { eco: 'C40', name: 'Damiano Defence' },
    setupMoves: ['e2e4', 'e7e5', 'g1f3', 'f7f6', 'f3e5'],
    offer: {
      moveUci: 'f3e5',
      role: 'SACRIFICE',
      explanation: 'White offers the knight to expose the black king and queen.',
    },
    response: {
      id: 'f-pawn-captures-knight',
      movesUci: ['f6e5'],
      explanation: 'Black accepts the knight and opens the king to Qh5 check.',
    },
    punishment: {
      lineUci: ['d1h5', 'e8e7', 'h5e5'],
      outcome: 'MATERIAL',
      explanation: 'White checks, displaces the king, and recovers the pawn while attacking the rook and king.',
    },
    safeDefense: {
      moveUci: 'd8e7',
      explanation: 'Black declines the knight and defends the e5 pawn with the queen.',
    },
    summary: 'A king-exposure candidate with a sound tactical sacrifice against a weakened f-pawn.',
    discoveryRef: 'https://en.wikipedia.org/wiki/Damiano_Defence',
  }),
  candidate({
    id: 'elephant-trap-main-v1',
    title: 'Elephant Trap candidate',
    aliases: ['Elephant Trap'],
    familyId: 'elephant-trap-family',
    side: 'BLACK',
    soundness: 'SOUND',
    opening: { eco: 'D50', name: "Queen's Gambit Declined" },
    setupMoves: ['d2d4', 'd7d5', 'c2c4', 'e7e6', 'b1c3', 'g8f6', 'c1g5', 'b8d7', 'c4d5', 'e6d5'],
    offer: {
      moveUci: 'e6d5',
      role: 'BAIT',
      explanation: 'Black appears to leave d5 available because the f6 knight is pinned.',
    },
    response: {
      id: 'take-d5-pawn',
      movesUci: ['c3d5'],
      explanation: 'White takes the pawn, assuming the pinned knight cannot recapture.',
    },
    punishment: {
      lineUci: ['f6d5', 'g5d8', 'f8b4', 'd1d2', 'b4d2', 'e1d2', 'e8d8'],
      outcome: 'MATERIAL',
      explanation: 'Black uses the intermediate bishop check to recover the queen and emerge a piece ahead.',
    },
    safeDefense: {
      moveUci: 'g1f3',
      explanation: 'White develops instead of trying to exploit the apparent pin tactically.',
    },
    summary: 'A classic pin-deflection candidate with a forcing intermediate check.',
    discoveryRef: 'https://en.wikipedia.org/wiki/Queen%27s_Gambit_Declined%2C_Elephant_Trap',
  }),
  candidate({
    id: 'lasker-underpromotion-v1',
    title: 'Lasker Trap underpromotion candidate',
    aliases: ['Lasker Trap'],
    familyId: 'lasker-trap-family',
    side: 'BLACK',
    soundness: 'PLAYABLE_RISK',
    opening: { eco: 'D08', name: 'Albin Countergambit' },
    setupMoves: ['d2d4', 'd7d5', 'c2c4', 'e7e5', 'd4e5', 'd5d4', 'e2e3', 'f8b4', 'c1d2', 'd4e3'],
    offer: {
      moveUci: 'd4e3',
      role: 'BAIT',
      explanation: 'Black advances the passed pawn and offers the b4 bishop.',
    },
    response: {
      id: 'bishop-captures-b4',
      movesUci: ['d2b4'],
      explanation: 'White takes the bishop and overlooks the promotion tactic.',
    },
    punishment: {
      lineUci: ['e3f2', 'e1e2', 'f2g1n'],
      outcome: 'MATERIAL',
      explanation: 'The pawn promotes to a knight with check, preserving the tactical bind and material gain.',
    },
    safeDefense: {
      moveUci: 'f2e3',
      explanation: 'White accepts doubled pawns and removes the dangerous passer.',
    },
    summary: 'An underpromotion candidate that requires promotion-aware UCI replay.',
    discoveryRef: 'https://en.wikipedia.org/wiki/Albin_Countergambit%2C_Lasker_Trap',
  }),
  candidate({
    id: 'mortimer-qa5-fork-v1',
    title: 'Mortimer Trap fork candidate',
    aliases: ['Mortimer Trap'],
    familyId: 'mortimer-trap-family',
    side: 'BLACK',
    soundness: 'DUBIOUS',
    opening: { eco: 'C65', name: 'Ruy Lopez, Berlin Defence' },
    setupMoves: ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1b5', 'g8f6', 'd2d3', 'c6e7'],
    offer: {
      moveUci: 'c6e7',
      role: 'BAIT',
      explanation: 'Black retreats the knight and appears to leave e5 undefended.',
    },
    response: {
      id: 'take-e5-pawn',
      movesUci: ['f3e5'],
      explanation: 'White takes the pawn and exposes the bishop and knight to a queen fork.',
    },
    punishment: {
      lineUci: ['c7c6', 'b5a4', 'd8a5'],
      outcome: 'MATERIAL',
      explanation: 'Black attacks the bishop and then forks the king and e5 knight with Qa5.',
    },
    safeDefense: {
      moveUci: 'b5c4',
      explanation: 'White develops the bishop actively instead of taking the pawn.',
    },
    summary: 'A deliberately inferior setup candidate used to test prominent objective-risk warnings.',
    discoveryRef: 'https://en.wikipedia.org/wiki/Ruy_Lopez%2C_Mortimer_Trap',
  }),
  candidate({
    id: 'marshall-petrov-bxh2-v1',
    title: 'Marshall Trap Petrov candidate',
    aliases: ['Marshall Trap'],
    familyId: 'marshall-petrov-trap-family',
    side: 'BLACK',
    soundness: 'SOUND',
    opening: { eco: 'C42', name: "Petrov's Defence" },
    setupMoves: ['e2e4', 'e7e5', 'g1f3', 'g8f6', 'f3e5', 'd7d6', 'e5f3', 'f6e4', 'd2d4', 'd6d5', 'f1d3', 'f8d6', 'e1g1', 'e8g8', 'c2c4', 'c8g4', 'c4d5', 'f7f5'],
    offer: {
      moveUci: 'f7f5',
      role: 'TACTICAL_PERMISSION',
      explanation: 'Black builds pressure on h2 and invites the rook to the e-file.',
    },
    response: {
      id: 'rook-to-e1',
      movesUci: ['f1e1'],
      explanation: 'White centralizes the rook but permits the bishop sacrifice and knight fork.',
    },
    punishment: {
      lineUci: ['g4h2', 'g1h2', 'e4f2'],
      outcome: 'MATERIAL',
      explanation: 'The bishop sacrifice drags the king to h2 and the knight forks major pieces from f2.',
    },
    safeDefense: {
      moveUci: 'b1c3',
      explanation: 'White develops the knight and reinforces the centre instead of entering the tactic.',
    },
    summary: 'A deflection-and-fork candidate in a mainstream opening structure.',
    discoveryRef: 'https://en.wikipedia.org/wiki/Petrov%27s_Defence%2C_Marshall_Trap',
  }),
  candidate({
    id: 'rubinstein-f5-v1',
    title: 'Rubinstein Trap candidate',
    aliases: ['Rubinstein Trap'],
    familyId: 'rubinstein-trap-family',
    side: 'WHITE',
    soundness: 'SOUND',
    opening: { eco: 'D60', name: "Queen's Gambit Declined, Orthodox Defence" },
    setupMoves: ['d2d4', 'd7d5', 'g1f3', 'g8f6', 'c2c4', 'e7e6', 'c1g5', 'b8d7', 'e2e3', 'f8e7', 'b1c3', 'e8g8', 'a1c1', 'f8e8', 'd1c2', 'a7a6', 'c4d5', 'e6d5', 'f1d3', 'c7c6', 'e1g1', 'f6e4', 'g5f4'],
    offer: {
      moveUci: 'g5f4',
      role: 'TACTICAL_PERMISSION',
      explanation: 'White completes development while leaving a tactical pressure point on d5 and c7.',
    },
    response: {
      id: 'advance-f-pawn',
      movesUci: ['f7f5'],
      explanation: 'Black supports the e4 knight but loosens the tactical defence of d5.',
    },
    punishment: {
      lineUci: ['c3d5'],
      outcome: 'MATERIAL',
      explanation: 'White wins the d5 pawn; cxd5 would allow Bc7 and trap the queen.',
    },
    safeDefense: {
      moveUci: 'd7f8',
      explanation: 'Black reorganizes without weakening the d5 tactical structure.',
    },
    summary: 'A positional-looking candidate where the punishment is a pawn win backed by a queen-trap threat.',
    discoveryRef: 'https://en.wikipedia.org/wiki/Queen%27s_Gambit_Declined%2C_Rubinstein_Trap',
  }),
  candidate({
    id: 'noahs-ark-c5-v1',
    title: "Noah's Ark bishop-trap candidate",
    aliases: ["Noah's Ark Trap"],
    familyId: 'noahs-ark-trap-family',
    side: 'BLACK',
    soundness: 'SOUND',
    opening: { eco: 'C70', name: 'Ruy Lopez' },
    setupMoves: ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1b5', 'a7a6', 'b5a4', 'd7d6', 'd2d4', 'b7b5', 'a4b3', 'c6d4', 'f3d4', 'e5d4', 'd1d4', 'c7c5'],
    offer: {
      moveUci: 'c7c5',
      role: 'BAIT',
      explanation: 'Black attacks the queen and begins the pawn net around the b3 bishop.',
    },
    response: {
      id: 'queen-centralizes-d5',
      movesUci: ['d4d5'],
      explanation: 'White keeps the queen active but permits the forcing bishop-trap construction.',
    },
    punishment: {
      lineUci: ['c8e6', 'd5c6', 'e6d7', 'c6d5', 'c5c4'],
      outcome: 'MATERIAL',
      explanation: 'The queen is driven while ...c4 completes the pawn cage around the b3 bishop.',
    },
    safeDefense: {
      moveUci: 'd4e3',
      explanation: 'White retreats the queen without allowing the same forcing tempo sequence.',
    },
    summary: 'A family-style piece-trap candidate based on a pawn cage rather than immediate tactics.',
    discoveryRef: 'https://en.wikipedia.org/wiki/Ruy_Lopez%2C_Noah%27s_Ark_Trap',
  }),
  candidate({
    id: 'tarrasch-open-qd7-v1',
    title: 'Tarrasch Trap Open Defence candidate',
    aliases: ['Tarrasch Trap, Open Defence'],
    familyId: 'tarrasch-trap-family',
    side: 'WHITE',
    soundness: 'SOUND',
    opening: { eco: 'C80', name: 'Ruy Lopez, Open Defence' },
    setupMoves: ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1b5', 'a7a6', 'b5a4', 'g8f6', 'e1g1', 'f6e4', 'd2d4', 'b7b5', 'a4b3', 'd7d5', 'd4e5', 'c8e6', 'c2c3', 'f8e7', 'f1e1', 'e8g8', 'f3d4'],
    offer: {
      moveUci: 'f3d4',
      role: 'TACTICAL_PERMISSION',
      explanation: 'White centralizes the knight and creates a tactical pin-and-overload possibility on e6 and e4.',
    },
    response: {
      id: 'queen-to-d7',
      movesUci: ['d8d7'],
      explanation: 'Black connects pieces but allows the e6 exchange to pin the recapturing queen.',
    },
    punishment: {
      lineUci: ['d4e6', 'd7e6', 'e1e4'],
      outcome: 'MATERIAL',
      explanation: 'White exchanges on e6 and then wins the exposed e4 knight with the rook.',
    },
    safeDefense: {
      moveUci: 'c6b8',
      explanation: 'Black retreats the knight without placing the queen on the vulnerable d7 square.',
    },
    summary: 'A pin-and-overload candidate in the Open Ruy Lopez.',
    discoveryRef: 'https://en.wikipedia.org/wiki/Ruy_Lopez%2C_Tarrasch_Trap',
  }),
  candidate({
    id: 'tarrasch-steinitz-castle-v1',
    title: 'Tarrasch Trap Steinitz candidate',
    aliases: ['Tarrasch Trap, Steinitz Defence', 'Dresden Trap'],
    familyId: 'tarrasch-trap-family',
    side: 'WHITE',
    soundness: 'SOUND',
    opening: { eco: 'C62', name: 'Ruy Lopez, Steinitz Defence' },
    setupMoves: ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1b5', 'd7d6', 'd2d4', 'c8d7', 'b1c3', 'g8f6', 'e1g1', 'f8e7', 'f1e1'],
    offer: {
      moveUci: 'f1e1',
      role: 'TACTICAL_PERMISSION',
      explanation: 'White reinforces e4 and invites natural castling before Black resolves the centre.',
    },
    response: {
      id: 'castle-into-pawn-loss',
      movesUci: ['e8g8'],
      explanation: 'Black castles and permits a forcing exchange sequence that loses the e5 pawn.',
    },
    punishment: {
      lineUci: ['b5c6', 'd7c6', 'd4e5', 'd6e5', 'd1d8', 'a8d8', 'f3e5'],
      outcome: 'MATERIAL',
      explanation: 'White exchanges defenders and wins the e5 pawn after the queen trade.',
    },
    safeDefense: {
      moveUci: 'e5d4',
      explanation: 'Black concedes the centre immediately instead of castling into the tactic.',
    },
    summary: 'A subtle centre-resolution candidate where the natural king-safety move is the temptation.',
    discoveryRef: 'https://en.wikipedia.org/wiki/Ruy_Lopez%2C_Tarrasch_Trap',
  }),
  candidate({
    id: 'wurzburger-bishop-trap-v1',
    title: 'Würzburger Trap bishop-capture candidate',
    aliases: ['Würzburger Trap'],
    familyId: 'wurzburger-trap-family',
    side: 'WHITE',
    soundness: 'PLAYABLE_RISK',
    opening: { eco: 'C29', name: 'Vienna Gambit' },
    setupMoves: ['e2e4', 'e7e5', 'b1c3', 'g8f6', 'f2f4', 'd7d5', 'f4e5', 'f6e4', 'd2d3', 'd8h4', 'g2g3', 'e4g3', 'g1f3', 'h4h5', 'c3d5', 'c8g4', 'd5f4', 'g4f3', 'f4h5', 'f3d1', 'h2g3'],
    offer: {
      moveUci: 'h2g3',
      role: 'TACTICAL_PERMISSION',
      explanation: 'White restores material and allows the bishop to take the c2 pawn.',
    },
    response: {
      id: 'bishop-takes-c2',
      movesUci: ['d1c2'],
      explanation: 'Black takes another pawn but places the bishop beyond its escape squares.',
    },
    punishment: {
      lineUci: ['b2b3'],
      outcome: 'MATERIAL',
      explanation: 'b3 traps the c2 bishop, which will be won by Kd2 or Rh2.',
    },
    safeDefense: {
      moveUci: 'd1g4',
      explanation: 'Black retreats the bishop along the open diagonal instead of taking c2.',
    },
    summary: 'A long forcing sequence ending in a positional bishop cage.',
    discoveryRef: 'https://en.wikipedia.org/wiki/Vienna_Game%2C_W%C3%BCrzburger_Trap',
  }),
  candidate({
    id: 'halosar-nb5-v1',
    title: 'Halosar Trap candidate',
    aliases: ['Halosar Trap'],
    familyId: 'halosar-trap-family',
    side: 'WHITE',
    soundness: 'DUBIOUS',
    opening: { eco: 'D00', name: 'Blackmar–Diemer Gambit, Ryder Gambit' },
    setupMoves: ['d2d4', 'd7d5', 'e2e4', 'd5e4', 'b1c3', 'g8f6', 'f2f3', 'e4f3', 'd1f3', 'd8d4', 'c1e3', 'd4b4', 'e1c1'],
    offer: {
      moveUci: 'e1c1',
      role: 'BAIT',
      explanation: 'White castles into an apparent pin opportunity against the queen and rook alignment.',
    },
    response: {
      id: 'bishop-pins-queen',
      movesUci: ['c8g4'],
      explanation: 'Black develops with a pin but overlooks the Nb5 and Nxc7 mating threat.',
    },
    punishment: {
      lineUci: ['c3b5', 'b8a6', 'f3b7'],
      outcome: 'MATERIAL',
      explanation: 'White creates the c7 threat and then captures b7 with a decisive attack on the rook.',
    },
    safeDefense: {
      moveUci: 'b4a5',
      explanation: 'Black moves the queen away without committing the bishop to the tactical pin.',
    },
    summary: 'A dubious-gambit candidate with a castling offer and a dual-threat punishment.',
    discoveryRef: 'https://www.nsvg.nl/main/archief.php?file=178+20130920+opening+Openingsvalletjes.txt&hoofdrubriek=theorie&mapid=100&rubriek=opening',
  }),
];
