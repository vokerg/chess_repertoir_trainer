import { importedGameSearchQuerySchema } from '@chess-trainer/contracts/imported-games';
import {
  parseImportedGameSearchQuery,
  parseImportedGameSearchQueryOverrides,
  serializeImportedGameSearchQuery,
} from './imported-game-search-query.codec';

describe('imported game search query codec', () => {
  it('parses every imported-game search field from CSV and scalar parameters', () => {
    const query = parseImportedGameSearchQuery(source({
      accountIds: '7,2',
      providers: 'LICHESS,CHESS_COM',
      from: '2026-01-01',
      to: '2026-02-02T23:59:59.999Z',
      resultForUser: 'WIN,DRAW',
      userColor: 'BLACK,WHITE',
      rated: 'false',
      speedCategory: 'rapid,blitz',
      variant: 'standard,chess960',
      openingEco: 'B20,C50',
      openingName: 'Sicilian',
      opponent: 'opponent',
      timeControl: '10+5',
      minUserRating: '1200',
      maxUserRating: '2200',
      minOpponentRating: '1300',
      maxOpponentRating: '2300',
      analysisStatus: 'FAILED,COMPLETED',
      plyIndexStatus: 'FAILED,INDEXED',
      tagFilter: 'NO_TAGS',
      tagCodes: '9,3',
      classification: 'BLUNDER,MISTAKE',
      minAccuracy: '45.5',
      maxAccuracy: '98',
      sort: 'endedAtAsc',
      limit: '125',
      cursor: 'opaque-cursor',
    }));

    expect(query).toEqual({
      accountIds: [2, 7],
      providers: ['CHESS_COM', 'LICHESS'],
      from: '2026-01-01',
      to: '2026-02-02T23:59:59.999Z',
      resultForUser: ['DRAW', 'WIN'],
      userColor: ['BLACK', 'WHITE'],
      rated: false,
      speedCategory: ['blitz', 'rapid'],
      variant: ['chess960', 'standard'],
      openingEco: ['B20', 'C50'],
      openingName: 'Sicilian',
      opponent: 'opponent',
      timeControl: '10+5',
      minUserRating: 1200,
      maxUserRating: 2200,
      minOpponentRating: 1300,
      maxOpponentRating: 2300,
      analysisStatus: ['COMPLETED', 'FAILED'],
      plyIndexStatus: ['FAILED', 'INDEXED'],
      tagFilter: 'NO_TAGS',
      tagCodes: [3, 9],
      classification: ['BLUNDER', 'MISTAKE'],
      minAccuracy: 45.5,
      maxAccuracy: 98,
      sort: 'endedAtAsc',
      limit: 125,
      cursor: 'opaque-cursor',
    });
  });

  it('serializes arrays as stable CSV and excludes cursor unless explicitly requested for an API page', () => {
    const query = importedGameSearchQuerySchema.parse({
      providers: 'LICHESS,CHESS_COM',
      rated: 'true',
      limit: '25',
      cursor: 'route-cursor',
    });

    const durable = serializeImportedGameSearchQuery(query);
    expect(durable.toString()).toBe(
      'providers=CHESS_COM%2CLICHESS&rated=true&sort=endedAtDesc&limit=25',
    );
    expect(durable.has('cursor')).toBeFalse();

    const page = serializeImportedGameSearchQuery(query, { cursor: 'next-page' });
    expect(page.get('cursor')).toBe('next-page');
  });

  it('round trips booleans, numbers, dates, timestamps, arrays, sort, and limit', () => {
    const original = parseImportedGameSearchQuery(source({
      accountIds: '12,4',
      from: '2026-03-01',
      to: '2026-03-31T23:59:59.999Z',
      rated: 'false',
      variant: 'standard,chess960',
      minAccuracy: '55.25',
      maxUserRating: '2100',
      sort: 'endedAtAsc',
      limit: '80',
    }));

    const roundTripped = parseImportedGameSearchQuery(serializeImportedGameSearchQuery(original));
    const { cursor: _cursor, ...durableOriginal } = original;
    expect(roundTripped).toEqual(durableOriginal);
  });

  it('ignores unknown and independently invalid recognized values while retaining valid values', () => {
    const overrides = parseImportedGameSearchQueryOverrides(source({
      arbitrary: 'forward-me',
      providers: 'INVALID',
      rated: 'sometimes',
      minAccuracy: '101',
      limit: '500',
      resultForUser: 'WIN',
      minOpponentRating: '1400',
    }));

    expect(overrides).toEqual({
      resultForUser: ['WIN'],
      minOpponentRating: 1400,
    });
  });

  it('uses contract defaults when sort and limit are omitted', () => {
    expect(parseImportedGameSearchQuery(source({}))).toEqual({
      sort: 'endedAtDesc',
      limit: 50,
    });
  });
});

function source(values: Record<string, string>): { get(name: string): string | null } {
  return { get: (name) => values[name] ?? null };
}
