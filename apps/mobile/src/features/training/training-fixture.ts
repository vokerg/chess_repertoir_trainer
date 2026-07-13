import {
  SERIALIZABLE_TRAINING_VERSION,
  createSerializableTrainingSession,
  type SerializableTrainingSession,
  type SerializableTrainingSubline,
} from 'chess-domain/training';

const START_FEN = 'startpos';
const AFTER_E4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
const AFTER_E5 = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';
const AFTER_NF3 = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2';
const AFTER_NC6 = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3';
const AFTER_BB5 = 'r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3';

export const PHASE_ONE_TRAINING_SUBLINE: SerializableTrainingSubline = {
  version: SERIALIZABLE_TRAINING_VERSION,
  lineId: 1,
  startingFen: START_FEN,
  sideToTrain: 'WHITE',
  sublineHash: 'phase-1-ruy-lopez-demo',
  sublineKeyVersion: 1,
  leafNodeId: 5,
  moves: [
    {
      nodeId: 1,
      moveUci: 'e2e4',
      moveSan: 'e4',
      fenBefore: START_FEN,
      fenAfter: AFTER_E4,
      isUserMove: true,
      comment: 'Claim space and open the bishop.',
    },
    {
      nodeId: 2,
      moveUci: 'e7e5',
      moveSan: 'e5',
      fenBefore: AFTER_E4,
      fenAfter: AFTER_E5,
      isUserMove: false,
    },
    {
      nodeId: 3,
      moveUci: 'g1f3',
      moveSan: 'Nf3',
      fenBefore: AFTER_E5,
      fenAfter: AFTER_NF3,
      isUserMove: true,
      comment: 'Develop while attacking e5.',
    },
    {
      nodeId: 4,
      moveUci: 'b8c6',
      moveSan: 'Nc6',
      fenBefore: AFTER_NF3,
      fenAfter: AFTER_NC6,
      isUserMove: false,
    },
    {
      nodeId: 5,
      moveUci: 'f1b5',
      moveSan: 'Bb5',
      fenBefore: AFTER_NC6,
      fenAfter: AFTER_BB5,
      isUserMove: true,
      branchLabel: 'Ruy Lopez',
      annotation: 'The bishop increases pressure on the e5 defender.',
    },
  ],
};

export function createPhaseOneTrainingSession(now = new Date()): SerializableTrainingSession {
  return createSerializableTrainingSession({
    sessionId: `phase-1-${now.getTime()}`,
    courseContentRevision: 1,
    startedAt: now.toISOString(),
    subline: PHASE_ONE_TRAINING_SUBLINE,
  });
}
