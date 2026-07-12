import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import prismaModule from '../../dist/prisma.js';
import {
  AccountPerformanceStatsService,
  buildAccountPerformanceStatsData,
} from '../../dist/services/accountPerformanceStatsService.js';

const prisma = prismaModule.default;

function game(options) {
  return {
    id: options.id,
    endedAt: new Date(options.endedAt),
    speedCategory: options.speedCategory ?? 'blitz',
    userColor: options.userColor ?? 'WHITE',
    whiteRating: options.userColor === 'BLACK' ? options.opponentRating : 1500,
    blackRating: options.userColor === 'BLACK' ? 1500 : options.opponentRating,
    opponentUsername: options.opponentUsername ?? `opponent-${options.id}`,
    resultForUser: options.resultForUser,
    providerUrl: options.providerUrl ?? null,
    timeControlRaw: Object.hasOwn(options, 'timeControlRaw') ? options.timeControlRaw : null,
    timeControlInitial: Object.hasOwn(options, 'timeControlInitial') ? options.timeControlInitial : 300,
    timeControlIncrement: Object.hasOwn(options, 'timeControlIncrement') ? options.timeControlIncrement : 0,
  };
}

function build(games) {
  return buildAccountPerformanceStatsData(games, { speeds: ['bullet', 'blitz', 'rapid'] });
}

{
  const stats = build([
    game({ id: 1, resultForUser: 'WIN', opponentRating: 1500, endedAt: '2024-01-01T00:00:00Z' }),
    game({ id: 2, resultForUser: 'WIN', opponentRating: 1700, endedAt: '2024-01-01T00:00:00Z' }),
    game({ id: 3, resultForUser: 'WIN', opponentRating: 1700, endedAt: '2024-02-01T00:00:00Z' }),
    game({ id: 4, resultForUser: 'WIN', opponentRating: 1700, endedAt: '2024-02-01T00:00:00Z' }),
    game({ id: 5, resultForUser: 'WIN', opponentRating: 1600, endedAt: '2024-03-01T00:00:00Z' }),
    game({ id: 6, resultForUser: 'WIN', opponentRating: null, endedAt: '2024-04-01T00:00:00Z' }),
    game({ id: 7, resultForUser: 'WIN', opponentRating: 1800, endedAt: '2024-01-01T00:00:00Z' }),
  ]);

  assert.equal(stats.bestVictories.length, 5);
  assert.deepEqual(
    stats.bestVictories.map((highlight) => highlight.gameId),
    [7, 4, 3, 2, 5],
  );
  assert.deepEqual(stats.bestVictory, stats.bestVictories[0]);
}

{
  const stats = build([
    game({ id: 10, resultForUser: 'LOSS', opponentRating: 1200, endedAt: '2024-01-01T00:00:00Z' }),
    game({ id: 11, resultForUser: 'LOSS', opponentRating: 900, endedAt: '2024-01-01T00:00:00Z' }),
    game({ id: 12, resultForUser: 'LOSS', opponentRating: 900, endedAt: '2024-02-01T00:00:00Z' }),
    game({ id: 13, resultForUser: 'LOSS', opponentRating: 900, endedAt: '2024-02-01T00:00:00Z' }),
    game({ id: 14, resultForUser: 'LOSS', opponentRating: 1000, endedAt: '2024-03-01T00:00:00Z' }),
    game({ id: 15, resultForUser: 'LOSS', opponentRating: null, endedAt: '2024-04-01T00:00:00Z' }),
    game({ id: 16, resultForUser: 'LOSS', opponentRating: 800, endedAt: '2024-01-01T00:00:00Z' }),
  ]);

  assert.equal(stats.mostEmbarrassingDefeats.length, 5);
  assert.deepEqual(
    stats.mostEmbarrassingDefeats.map((highlight) => highlight.gameId),
    [16, 13, 12, 11, 14],
  );
  assert.deepEqual(stats.mostEmbarrassingDefeat, stats.mostEmbarrassingDefeats[0]);
}

{
  const stats = build([
    game({ id: 20, resultForUser: 'WIN', opponentRating: null, endedAt: '2024-03-01T00:00:00Z' }),
    game({ id: 21, resultForUser: 'WIN', opponentRating: 1000, endedAt: '2024-01-01T00:00:00Z' }),
    game({ id: 22, resultForUser: 'LOSS', opponentRating: null, endedAt: '2024-03-01T00:00:00Z' }),
    game({ id: 23, resultForUser: 'LOSS', opponentRating: 1000, endedAt: '2024-01-01T00:00:00Z' }),
  ]);

  assert.deepEqual(
    stats.bestVictories.map((highlight) => highlight.gameId),
    [21, 20],
  );
  assert.deepEqual(
    stats.mostEmbarrassingDefeats.map((highlight) => highlight.gameId),
    [23, 22],
  );
}

{
  const stats = build([
    game({ id: 30, resultForUser: 'WIN', opponentRating: 1000, endedAt: '2024-01-01T00:00:00Z' }),
    game({ id: 31, resultForUser: 'DRAW', opponentRating: 1100, endedAt: '2024-01-02T00:00:00Z' }),
    game({ id: 32, resultForUser: 'LOSS', opponentRating: 1200, endedAt: '2024-01-03T00:00:00Z' }),
    game({ id: 33, resultForUser: 'ABORTED', opponentRating: 2500, endedAt: '2024-01-04T00:00:00Z' }),
    game({ id: 34, resultForUser: null, opponentRating: 2600, endedAt: '2024-01-05T00:00:00Z' }),
  ]);

  assert.equal(stats.gamesCount, 3);
  assert.deepEqual(stats.wdl, { wins: 1, draws: 1, losses: 1 });
  assert.deepEqual(stats.averageOpponentRating, { wins: 1000, draws: 1100, losses: 1200 });
  assert.deepEqual(
    stats.bestVictories.map((highlight) => highlight.gameId),
    [30],
  );
  assert.deepEqual(
    stats.mostEmbarrassingDefeats.map((highlight) => highlight.gameId),
    [32],
  );
}

{
  const stats = build([
    game({ id: 40, resultForUser: 'WIN', opponentRating: 1000, endedAt: '2024-01-01T00:00:00Z' }),
    game({ id: 41, resultForUser: 'DRAW', opponentRating: 1100, endedAt: '2024-01-02T00:00:00Z' }),
    game({ id: 42, resultForUser: 'LOSS', opponentRating: 1200, endedAt: '2024-01-03T00:00:00Z' }),
  ]);

  assert.deepEqual(stats.timeControlWdl, [
    {
      timeControl: '5+0',
      gamesCount: 3,
      wins: 1,
      draws: 1,
      losses: 1,
      scorePercent: 50,
    },
  ]);
}

{
  const stats = build([
    game({
      id: 50,
      resultForUser: 'WIN',
      opponentRating: 1000,
      endedAt: '2024-01-01T00:00:00Z',
      timeControlInitial: 300,
      timeControlIncrement: 5,
    }),
    game({
      id: 51,
      resultForUser: 'WIN',
      opponentRating: 1100,
      endedAt: '2024-01-02T00:00:00Z',
      timeControlInitial: 300,
      timeControlIncrement: 5,
    }),
    game({
      id: 52,
      resultForUser: 'LOSS',
      opponentRating: 1200,
      endedAt: '2024-01-03T00:00:00Z',
      timeControlInitial: 300,
      timeControlIncrement: 5,
    }),
  ]);

  assert.deepEqual(stats.timeControlWdl, [
    {
      timeControl: '5+5',
      gamesCount: 3,
      wins: 2,
      draws: 0,
      losses: 1,
      scorePercent: 67,
    },
  ]);
}

{
  const stats = build([
    game({
      id: 60,
      resultForUser: 'WIN',
      opponentRating: 1000,
      endedAt: '2024-01-01T00:00:00Z',
      timeControlRaw: '10+0',
      timeControlInitial: null,
      timeControlIncrement: null,
    }),
    game({
      id: 61,
      resultForUser: 'LOSS',
      opponentRating: 1100,
      endedAt: '2024-01-02T00:00:00Z',
      timeControlRaw: '10 + 0',
      timeControlInitial: null,
      timeControlIncrement: null,
    }),
  ]);

  assert.deepEqual(stats.timeControlWdl, [
    {
      timeControl: '10+0',
      gamesCount: 2,
      wins: 1,
      draws: 0,
      losses: 1,
      scorePercent: 50,
    },
  ]);
}

{
  const stats = build([
    game({
      id: 70,
      resultForUser: 'WIN',
      opponentRating: 1000,
      endedAt: '2024-01-01T00:00:00Z',
      timeControlInitial: 600,
      timeControlIncrement: 0,
    }),
    game({
      id: 71,
      resultForUser: 'WIN',
      opponentRating: 1100,
      endedAt: '2024-01-02T00:00:00Z',
      timeControlInitial: 300,
      timeControlIncrement: 5,
    }),
    game({
      id: 72,
      resultForUser: 'LOSS',
      opponentRating: 1200,
      endedAt: '2024-01-03T00:00:00Z',
      timeControlInitial: 600,
      timeControlIncrement: 0,
    }),
    game({
      id: 73,
      resultForUser: 'DRAW',
      opponentRating: 1300,
      endedAt: '2024-01-04T00:00:00Z',
      timeControlInitial: 300,
      timeControlIncrement: 5,
    }),
    game({
      id: 74,
      resultForUser: 'WIN',
      opponentRating: 1400,
      endedAt: '2024-01-05T00:00:00Z',
      timeControlInitial: 180,
      timeControlIncrement: 0,
    }),
  ]);

  assert.deepEqual(
    stats.timeControlWdl.map((bucket) => bucket.timeControl),
    ['10+0', '5+5', '3+0'],
  );
}

{
  const stats = build([]);

  assert.equal(stats.bestVictory, null);
  assert.equal(stats.mostEmbarrassingDefeat, null);
}

{
  const suffix = randomUUID();
  const user = await prisma.appUser.create({
    data: { displayName: 'Performance query test', authProvider: 'test', authSubject: `performance-${suffix}` },
  });
  try {
    const account = await prisma.externalAccount.create({
      data: { userId: user.id, provider: 'LICHESS', username: `performance-${suffix}` },
    });
    const createGame = (providerGameId, resultForUser, opponentRating, endedAt, opponentUsername) => prisma.importedGame.create({
      data: {
        userId: user.id,
        accountId: account.id,
        provider: 'LICHESS',
        providerGameId,
        endedAt: new Date(endedAt),
        speedCategory: 'blitz',
        userColor: 'WHITE',
        whiteRating: 1500,
        blackRating: opponentRating,
        opponentUsername,
        resultForUser,
        timeControlRaw: '300+0',
        timeControlInitial: 300,
        timeControlIncrement: 0,
      },
    });

    const rows = [
      ['w1', 'WIN', 1800, '2026-01-01T12:00:00Z'],
      ['w2', 'WIN', 1700, '2026-01-02T12:00:00Z'],
      ['w3', 'WIN', 1700, '2026-01-02T12:00:00Z'],
      ['w4', 'WIN', 1600, '2026-01-03T12:00:00Z'],
      ['w5', 'WIN', 1500, '2026-01-04T12:00:00Z'],
      ['w6', 'WIN', 1400, '2026-01-05T12:00:00Z'],
      ['d1', 'DRAW', 1300, '2026-01-06T12:00:00Z'],
      ['l1', 'LOSS', 800, '2026-01-07T12:00:00Z'],
      ['l2', 'LOSS', 900, '2026-01-08T12:00:00Z'],
      ['l3', 'LOSS', 900, '2026-01-09T12:00:00Z'],
      ['l4', 'LOSS', 1000, '2026-01-10T12:00:00Z'],
      ['l5', 'LOSS', 1100, '2026-01-11T12:00:00Z'],
      ['l6', 'LOSS', 1200, '2026-01-12T12:00:00Z'],
    ];
    for (const [name, result, rating, endedAt] of rows) {
      await createGame(`${name}-${suffix}`, result, rating, endedAt, name);
    }

    const stats = await AccountPerformanceStatsService.getForAccount(user.id, account.id, {
      speeds: ['bullet', 'blitz', 'rapid'],
    });
    assert.ok(stats);
    assert.equal(stats.gamesCount, 13);
    assert.deepEqual(stats.wdl, { wins: 6, draws: 1, losses: 6 });
    assert.deepEqual(stats.averageOpponentRating, { wins: 1617, draws: 1300, losses: 983 });
    assert.deepEqual(stats.bestVictories.map((item) => item.opponentUsername), ['w1', 'w3', 'w2', 'w4', 'w5']);
    assert.deepEqual(stats.mostEmbarrassingDefeats.map((item) => item.opponentUsername), ['l1', 'l3', 'l2', 'l4', 'l5']);
    assert.deepEqual(stats.timeControlWdl, [{
      timeControl: '5+0', gamesCount: 13, wins: 6, draws: 1, losses: 6, scorePercent: 50,
    }]);
  } finally {
    await prisma.appUser.delete({ where: { id: user.id } });
  }
}

console.log('Account performance stats tests passed.');
await prisma.$disconnect();
