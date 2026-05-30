import { describe, expect, it } from 'vitest';
import { mapApiErrorBody } from '@/api/errors';
import { mapGameFiltersToQueryString } from '@/features/games/utils/gameFilters';
import { buildGameTree, nextLocalSidelineId, parsePgnMoves } from '@/features/games/utils/gameTree';
import { openingAnalysisQueryString } from '@/features/openingAnalysis/utils';
import { formatTimeControl } from '@/utils/timeControl';
import { lineStatus } from '@/utils/lineStatus';

describe('lineStatus', () => {
  it('maps status buckets', () => {
    expect(lineStatus({ totalAttempts: 0 })).toBe('NEW');
    expect(lineStatus({ totalAttempts: 3, passedCount: 1, failedCount: 2 })).toBe('WEAK');
    expect(lineStatus({ totalAttempts: 3, passedCount: 3, failedCount: 0 })).toBe('CLEAN');
    expect(lineStatus({ totalAttempts: 3, passedCount: 2, failedCount: 1 })).toBe('REVIEW');
  });
});

describe('formatTimeControl', () => {
  it('formats seconds, minutes, and decimal minutes', () => {
    expect(formatTimeControl(30, 0)).toBe('30s+0');
    expect(formatTimeControl(300, 3)).toBe('5+3');
    expect(formatTimeControl(90, 1)).toBe('1.5+1');
  });
});

describe('query strings', () => {
  it('maps game filters using web-compatible comma lists', () => {
    expect(mapGameFiltersToQueryString({ limit: 50, providers: ['LICHESS', 'CHESS_COM'], rated: true })).toBe(
      '?limit=50&providers=LICHESS%2CCHESS_COM&rated=true',
    );
  });

  it('forces opening analysis defaults', () => {
    const query = openingAnalysisQueryString({ fen: 'startpos', userColor: 'WHITE' });
    expect(query).toContain('rated=true');
    expect(query).toContain('limit=200');
    expect(query).toContain('sort=endedAtDesc');
    expect(query).toContain('userColor=WHITE');
  });
});

describe('PGN parsing and tree', () => {
  it('maps ply and move numbers', () => {
    const moves = parsePgnMoves('1. e4 e5 2. Nf3 Nc6');
    expect(moves[0]).toMatchObject({ plyNumber: 1, moveNumber: 1, uci: 'e2e4' });
    expect(moves[3]).toMatchObject({ plyNumber: 4, moveNumber: 2, uci: 'b8c6' });
  });

  it('creates root id zero and local ids at one million', () => {
    const tree = buildGameTree('1. e4 e5');
    expect(tree.root.id).toBe(0);
    expect(nextLocalSidelineId(0)).toBe(1_000_000);
  });
});

describe('API error mapper', () => {
  it('handles known backend bodies', () => {
    expect(mapApiErrorBody({ error: 'Bad move' })).toBe('Bad move');
    expect(mapApiErrorBody({ message: 'Missing' })).toBe('Missing');
    expect(mapApiErrorBody({ error: [{ path: ['name'], message: 'Required' }] })).toBe('name: Required');
  });
});
