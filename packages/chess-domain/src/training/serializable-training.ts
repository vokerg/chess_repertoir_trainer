export const SERIALIZABLE_TRAINING_VERSION = 1 as const;

export type SerializableTrainingVersion = typeof SERIALIZABLE_TRAINING_VERSION;
export type SerializableTrainingSide = 'WHITE' | 'BLACK';
export type SerializableTrainingStatus = 'IN_PROGRESS' | 'PASSED' | 'FAILED';

export interface SerializableTrainingMoveSnapshot {
  nodeId: number;
  moveUci: string;
  moveSan: string;
  fenBefore: string;
  fenAfter: string;
  isUserMove: boolean;
  comment?: string | null;
  annotation?: string | null;
  branchLabel?: string | null;
}

export interface SerializableTrainingSubline {
  version: SerializableTrainingVersion;
  lineId: number;
  startingFen: string;
  sideToTrain: SerializableTrainingSide;
  sublineHash: string;
  sublineKeyVersion: number;
  leafNodeId: number;
  moves: SerializableTrainingMoveSnapshot[];
}

export type SerializableTrainingEventKind =
  | 'MOVE_ATTEMPT'
  | 'MISSED_ON_EARLY_FINISH';

export interface SerializableTrainingEvent {
  version: SerializableTrainingVersion;
  sequence: number;
  kind: SerializableTrainingEventKind;
  occurredAt: string;
  fenBefore: string;
  expectedNodeId: number;
  expectedMoveUci: string;
  playedMoveUci: string | null;
  wasCorrect: boolean;
}

export interface SerializableTrainingCounters {
  mistakesCount: number;
  totalExpectedMoves: number;
  correctMoves: number;
  accuracy: number | null;
}

export interface SerializableTrainingSession {
  version: SerializableTrainingVersion;
  sessionId: string;
  lineId: number;
  sublineHash: string;
  sublineKeyVersion: number;
  courseContentRevision: number;
  sideToTrain: SerializableTrainingSide;
  startingFen: string;
  startedAt: string;
  completedAt: string | null;
  status: SerializableTrainingStatus;
  nextMoveIndex: number;
  expectedMoveIndex: number | null;
  currentFen: string;
  lastMoveUci: string | null;
  completed: boolean;
  completedEarly: boolean;
  counters: SerializableTrainingCounters;
  events: SerializableTrainingEvent[];
}

export interface AppliedTrainingMove {
  nodeId: number;
  moveUci: string;
  moveSan: string;
  fenAfter: string;
  isUserMove: boolean;
}

export interface SerializableTrainingTransition {
  session: SerializableTrainingSession;
  correct: boolean;
  expectedMoveUci: string;
  playedMoveUci: string | null;
  appliedMoves: AppliedTrainingMove[];
}

export interface SerializableTrainingReviewMistake {
  sequence: number;
  occurredAt: string;
  kind: SerializableTrainingEventKind;
  fenBefore: string;
  expectedNodeId: number;
  expectedMoveUci: string;
  expectedMoveSan: string;
  playedMoveUci: string | null;
  comment: string | null;
  annotation: string | null;
  branchLabel: string | null;
}

export interface SerializableTrainingReview {
  sessionId: string;
  lineId: number;
  sublineHash: string;
  status: SerializableTrainingStatus;
  completed: boolean;
  completedEarly: boolean;
  counters: SerializableTrainingCounters;
  mistakes: SerializableTrainingReviewMistake[];
}

export interface CreateSerializableTrainingSessionInput {
  sessionId: string;
  courseContentRevision: number;
  startedAt: string;
  subline: SerializableTrainingSubline;
}

export function createSerializableTrainingSession(
  input: CreateSerializableTrainingSessionInput,
): SerializableTrainingSession {
  validateSubline(input.subline);
  assertNonEmpty(input.sessionId, 'sessionId');
  assertPositiveInteger(input.courseContentRevision, 'courseContentRevision');
  assertIsoDate(input.startedAt, 'startedAt');

  const initial: SerializableTrainingSession = {
    version: SERIALIZABLE_TRAINING_VERSION,
    sessionId: input.sessionId,
    lineId: input.subline.lineId,
    sublineHash: input.subline.sublineHash,
    sublineKeyVersion: input.subline.sublineKeyVersion,
    courseContentRevision: input.courseContentRevision,
    sideToTrain: input.subline.sideToTrain,
    startingFen: input.subline.startingFen,
    startedAt: input.startedAt,
    completedAt: null,
    status: 'IN_PROGRESS',
    nextMoveIndex: 0,
    expectedMoveIndex: null,
    currentFen: input.subline.startingFen,
    lastMoveUci: null,
    completed: false,
    completedEarly: false,
    counters: emptyCounters(),
    events: [],
  };

  return advanceOpponentMoves(initial, input.subline, input.startedAt).session;
}

export function applySerializableTrainingMove(
  session: SerializableTrainingSession,
  subline: SerializableTrainingSubline,
  moveUci: string,
  occurredAt: string,
): SerializableTrainingTransition {
  validateSessionForSubline(session, subline);
  assertIsoDate(occurredAt, 'occurredAt');
  assertNonEmpty(moveUci, 'moveUci');
  if (session.completed) throw new Error('Training session is already completed.');

  const expectedMoveIndex = session.expectedMoveIndex;
  if (expectedMoveIndex === null) {
    throw new Error('No trained-side move is expected in the current position.');
  }
  const expected = subline.moves[expectedMoveIndex];
  if (!expected || !expected.isUserMove) {
    throw new Error('Expected move index does not identify a trained-side move.');
  }

  const correct = expected.moveUci === moveUci;
  const event: SerializableTrainingEvent = {
    version: SERIALIZABLE_TRAINING_VERSION,
    sequence: session.events.length + 1,
    kind: 'MOVE_ATTEMPT',
    occurredAt,
    fenBefore: session.currentFen,
    expectedNodeId: expected.nodeId,
    expectedMoveUci: expected.moveUci,
    playedMoveUci: moveUci,
    wasCorrect: correct,
  };
  const events = [...session.events, event];
  const counters = deriveSerializableTrainingCounters(events);

  if (!correct) {
    return {
      session: { ...session, counters, events },
      correct: false,
      expectedMoveUci: expected.moveUci,
      playedMoveUci: moveUci,
      appliedMoves: [],
    };
  }

  const acceptedSession: SerializableTrainingSession = {
    ...session,
    nextMoveIndex: expectedMoveIndex + 1,
    expectedMoveIndex: null,
    currentFen: expected.fenAfter,
    lastMoveUci: expected.moveUci,
    counters,
    events,
  };
  const advanced = advanceOpponentMoves(acceptedSession, subline, occurredAt);

  return {
    session: advanced.session,
    correct: true,
    expectedMoveUci: expected.moveUci,
    playedMoveUci: moveUci,
    appliedMoves: [toAppliedMove(expected), ...advanced.appliedMoves],
  };
}

export function finishSerializableTrainingEarly(
  session: SerializableTrainingSession,
  subline: SerializableTrainingSubline,
  occurredAt: string,
): SerializableTrainingTransition {
  validateSessionForSubline(session, subline);
  assertIsoDate(occurredAt, 'occurredAt');
  if (session.completed) throw new Error('Training session is already completed.');

  const expectedMoveIndex = session.expectedMoveIndex;
  if (expectedMoveIndex === null) {
    throw new Error('No trained-side move is available to record as missed.');
  }
  const expected = subline.moves[expectedMoveIndex];
  if (!expected || !expected.isUserMove) {
    throw new Error('Expected move index does not identify a trained-side move.');
  }

  const event: SerializableTrainingEvent = {
    version: SERIALIZABLE_TRAINING_VERSION,
    sequence: session.events.length + 1,
    kind: 'MISSED_ON_EARLY_FINISH',
    occurredAt,
    fenBefore: session.currentFen,
    expectedNodeId: expected.nodeId,
    expectedMoveUci: expected.moveUci,
    playedMoveUci: null,
    wasCorrect: false,
  };
  const events = [...session.events, event];
  const counters = deriveSerializableTrainingCounters(events);

  return {
    session: {
      ...session,
      completedAt: occurredAt,
      status: 'FAILED',
      expectedMoveIndex: null,
      completed: true,
      completedEarly: true,
      counters,
      events,
    },
    correct: false,
    expectedMoveUci: expected.moveUci,
    playedMoveUci: null,
    appliedMoves: [],
  };
}

export function restoreSerializableTrainingSession(
  snapshot: SerializableTrainingSession,
  subline: SerializableTrainingSubline,
): SerializableTrainingSession {
  validateSessionForSubline(snapshot, subline);
  const replayedStart = createSerializableTrainingSession({
    sessionId: snapshot.sessionId,
    courseContentRevision: snapshot.courseContentRevision,
    startedAt: snapshot.startedAt,
    subline,
  });

  let replayed = replayedStart;
  for (const persistedEvent of snapshot.events) {
    if (persistedEvent.version !== SERIALIZABLE_TRAINING_VERSION) {
      throw new Error(`Unsupported training event version ${persistedEvent.version}.`);
    }
    if (persistedEvent.sequence !== replayed.events.length + 1) {
      throw new Error('Training event sequence is not contiguous.');
    }

    const transition = persistedEvent.kind === 'MOVE_ATTEMPT'
      ? applySerializableTrainingMove(
          replayed,
          subline,
          requirePlayedMove(persistedEvent),
          persistedEvent.occurredAt,
        )
      : finishSerializableTrainingEarly(replayed, subline, persistedEvent.occurredAt);

    const replayedEvent = transition.session.events.at(-1);
    if (!replayedEvent || !sameEvent(replayedEvent, persistedEvent)) {
      throw new Error(`Training event ${persistedEvent.sequence} does not match deterministic replay.`);
    }
    replayed = transition.session;
  }

  if (!sameSessionProjection(replayed, snapshot)) {
    throw new Error('Training session snapshot does not match deterministic replay.');
  }
  return replayed;
}

export function deriveSerializableTrainingReview(
  session: SerializableTrainingSession,
  subline: SerializableTrainingSubline,
): SerializableTrainingReview {
  validateSessionForSubline(session, subline);
  const moveByNodeId = new Map(subline.moves.map((move) => [move.nodeId, move]));

  return {
    sessionId: session.sessionId,
    lineId: session.lineId,
    sublineHash: session.sublineHash,
    status: session.status,
    completed: session.completed,
    completedEarly: session.completedEarly,
    counters: { ...session.counters },
    mistakes: session.events
      .filter((event) => !event.wasCorrect)
      .map((event) => {
        const move = moveByNodeId.get(event.expectedNodeId);
        if (!move) throw new Error(`Review move node ${event.expectedNodeId} is missing from the subline.`);
        return {
          sequence: event.sequence,
          occurredAt: event.occurredAt,
          kind: event.kind,
          fenBefore: event.fenBefore,
          expectedNodeId: event.expectedNodeId,
          expectedMoveUci: event.expectedMoveUci,
          expectedMoveSan: move.moveSan,
          playedMoveUci: event.playedMoveUci,
          comment: move.comment ?? null,
          annotation: move.annotation ?? null,
          branchLabel: move.branchLabel ?? null,
        };
      }),
  };
}

export function deriveSerializableTrainingCounters(
  events: readonly SerializableTrainingEvent[],
): SerializableTrainingCounters {
  const correctMoves = events.filter((event) => event.wasCorrect).length;
  const totalExpectedMoves = events.length;
  const mistakesCount = totalExpectedMoves - correctMoves;
  return {
    mistakesCount,
    totalExpectedMoves,
    correctMoves,
    accuracy: totalExpectedMoves === 0 ? null : correctMoves / totalExpectedMoves,
  };
}

export function getSerializableExpectedMove(
  session: SerializableTrainingSession,
  subline: SerializableTrainingSubline,
): SerializableTrainingMoveSnapshot | null {
  validateSessionForSubline(session, subline);
  return session.expectedMoveIndex === null
    ? null
    : subline.moves[session.expectedMoveIndex] ?? null;
}

function advanceOpponentMoves(
  session: SerializableTrainingSession,
  subline: SerializableTrainingSubline,
  completionTime: string,
): { session: SerializableTrainingSession; appliedMoves: AppliedTrainingMove[] } {
  let nextMoveIndex = session.nextMoveIndex;
  let currentFen = session.currentFen;
  let lastMoveUci = session.lastMoveUci;
  const appliedMoves: AppliedTrainingMove[] = [];

  while (nextMoveIndex < subline.moves.length) {
    const next = subline.moves[nextMoveIndex]!;
    if (next.isUserMove) {
      return {
        session: {
          ...session,
          nextMoveIndex,
          expectedMoveIndex: nextMoveIndex,
          currentFen,
          lastMoveUci,
        },
        appliedMoves,
      };
    }
    currentFen = next.fenAfter;
    lastMoveUci = next.moveUci;
    appliedMoves.push(toAppliedMove(next));
    nextMoveIndex += 1;
  }

  return {
    session: {
      ...session,
      nextMoveIndex,
      expectedMoveIndex: null,
      currentFen,
      lastMoveUci,
      completedAt: completionTime,
      status: session.counters.mistakesCount > 0 ? 'FAILED' : 'PASSED',
      completed: true,
    },
    appliedMoves,
  };
}

function validateSubline(subline: SerializableTrainingSubline): void {
  if (subline.version !== SERIALIZABLE_TRAINING_VERSION) {
    throw new Error(`Unsupported training subline version ${subline.version}.`);
  }
  assertPositiveInteger(subline.lineId, 'lineId');
  assertNonEmpty(subline.startingFen, 'startingFen');
  assertNonEmpty(subline.sublineHash, 'sublineHash');
  assertPositiveInteger(subline.sublineKeyVersion, 'sublineKeyVersion');
  assertPositiveInteger(subline.leafNodeId, 'leafNodeId');
  if (subline.moves.length === 0) throw new Error('Training subline must contain at least one move.');

  let expectedFenBefore = subline.startingFen;
  const nodeIds = new Set<number>();
  for (const move of subline.moves) {
    assertPositiveInteger(move.nodeId, 'move.nodeId');
    assertNonEmpty(move.moveUci, 'move.moveUci');
    assertNonEmpty(move.moveSan, 'move.moveSan');
    assertNonEmpty(move.fenBefore, 'move.fenBefore');
    assertNonEmpty(move.fenAfter, 'move.fenAfter');
    if (nodeIds.has(move.nodeId)) throw new Error(`Duplicate training move node ${move.nodeId}.`);
    if (move.fenBefore !== expectedFenBefore) {
      throw new Error(`Training move node ${move.nodeId} does not continue the previous FEN.`);
    }
    nodeIds.add(move.nodeId);
    expectedFenBefore = move.fenAfter;
  }

  if (subline.moves.at(-1)?.nodeId !== subline.leafNodeId) {
    throw new Error('Training subline does not end at its declared leaf node.');
  }
}

function validateSessionForSubline(
  session: SerializableTrainingSession,
  subline: SerializableTrainingSubline,
): void {
  validateSubline(subline);
  if (session.version !== SERIALIZABLE_TRAINING_VERSION) {
    throw new Error(`Unsupported training session version ${session.version}.`);
  }
  if (
    session.lineId !== subline.lineId ||
    session.sublineHash !== subline.sublineHash ||
    session.sublineKeyVersion !== subline.sublineKeyVersion ||
    session.sideToTrain !== subline.sideToTrain ||
    session.startingFen !== subline.startingFen
  ) {
    throw new Error('Training session does not belong to the supplied subline snapshot.');
  }
  assertNonEmpty(session.sessionId, 'sessionId');
  assertPositiveInteger(session.courseContentRevision, 'courseContentRevision');
  assertIsoDate(session.startedAt, 'startedAt');
  if (session.completedAt !== null) assertIsoDate(session.completedAt, 'completedAt');
}

function toAppliedMove(move: SerializableTrainingMoveSnapshot): AppliedTrainingMove {
  return {
    nodeId: move.nodeId,
    moveUci: move.moveUci,
    moveSan: move.moveSan,
    fenAfter: move.fenAfter,
    isUserMove: move.isUserMove,
  };
}

function emptyCounters(): SerializableTrainingCounters {
  return { mistakesCount: 0, totalExpectedMoves: 0, correctMoves: 0, accuracy: null };
}

function resultForCounters(counters: SerializableTrainingCounters): SerializableTrainingStatus {
  return counters.mistakesCount > 0 ? 'FAILED' : 'PASSED';
}

function requirePlayedMove(event: SerializableTrainingEvent): string {
  if (event.playedMoveUci === null) {
    throw new Error(`Move attempt event ${event.sequence} is missing playedMoveUci.`);
  }
  return event.playedMoveUci;
}

function sameEvent(left: SerializableTrainingEvent, right: SerializableTrainingEvent): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function sameSessionProjection(
  left: SerializableTrainingSession,
  right: SerializableTrainingSession,
): boolean {
  return JSON.stringify({
    version: left.version,
    sessionId: left.sessionId,
    lineId: left.lineId,
    sublineHash: left.sublineHash,
    sublineKeyVersion: left.sublineKeyVersion,
    courseContentRevision: left.courseContentRevision,
    sideToTrain: left.sideToTrain,
    startingFen: left.startingFen,
    startedAt: left.startedAt,
    completedAt: left.completedAt,
    status: left.status,
    nextMoveIndex: left.nextMoveIndex,
    expectedMoveIndex: left.expectedMoveIndex,
    currentFen: left.currentFen,
    lastMoveUci: left.lastMoveUci,
    completed: left.completed,
    completedEarly: left.completedEarly,
    counters: left.counters,
    events: left.events,
  }) === JSON.stringify({
    version: right.version,
    sessionId: right.sessionId,
    lineId: right.lineId,
    sublineHash: right.sublineHash,
    sublineKeyVersion: right.sublineKeyVersion,
    courseContentRevision: right.courseContentRevision,
    sideToTrain: right.sideToTrain,
    startingFen: right.startingFen,
    startedAt: right.startedAt,
    completedAt: right.completedAt,
    status: right.status,
    nextMoveIndex: right.nextMoveIndex,
    expectedMoveIndex: right.expectedMoveIndex,
    currentFen: right.currentFen,
    lastMoveUci: right.lastMoveUci,
    completed: right.completed,
    completedEarly: right.completedEarly,
    counters: right.counters,
    events: right.events,
  });
}

function assertPositiveInteger(value: number, name: string): void {
  if (!Number.isInteger(value) || value < 1) throw new Error(`${name} must be a positive integer.`);
}

function assertNonEmpty(value: string, name: string): void {
  if (value.trim().length === 0) throw new Error(`${name} must not be empty.`);
}

function assertIsoDate(value: string, name: string): void {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value) || Number.isNaN(Date.parse(value))) {
    throw new Error(`${name} must be an ISO-8601 UTC timestamp.`);
  }
}
