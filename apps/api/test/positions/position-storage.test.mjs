import assert from 'node:assert/strict';
import { Prisma } from '@prisma/client';
import prismaModule from '../../dist/prisma.js';
import { encodeNormalizedFenCompact } from 'chess-domain';
import { compactPositionIdentity, compactPositionMapKey, hydratePositionFen, normalizedFenFromPosition } from '../../dist/modules/positions/position-storage.js';
import { findOrCreatePositionByNormalizedFen } from '../../dist/modules/analysis/analysis.repository.prisma.js';

const fen = '7k/8/8/8/8/8/4K3/8 w - -';
const otherFen = '7k/8/8/8/8/8/3K4/8 w - -';
const data = compactPositionIdentity(fen);
assert.equal(compactPositionMapKey(data), compactPositionMapKey(Buffer.from(data)), 'map identity is stable across Prisma/domain byte types');
assert.deepEqual(data, encodeNormalizedFenCompact(fen));
assert.equal(normalizedFenFromPosition({ id: 42, positionDataCompact: data }, fen), fen);
assert.throws(() => normalizedFenFromPosition({ id: 42, positionDataCompact: null }), /id=42.*NULL positionDataCompact/);
assert.throws(() => normalizedFenFromPosition({ id: 42, positionDataCompact: new Uint8Array([1]) }), /id=42.*Invalid compact/);
assert.throws(() => normalizedFenFromPosition({ id: 42, positionDataCompact: data }, otherFen), /id=42.*Expected.*decoded/);
assert.deepEqual(hydratePositionFen({ id: 42, positionDataCompact: data, analysis: { id: 11 } }), { normalizedFen: fen, analysis: { id: 11 } });

const prisma = prismaModule.default;
const originalCreate = prisma.position.create;
const originalLookup = prisma.position.findUnique;
const uniqueError = new Prisma.PrismaClientKnownRequestError('Unique conflict', { code: 'P2002', clientVersion: 'test' });
try {
  prisma.position.create = async ({ data: write, select }) => {
    assert.deepEqual(Object.keys(write).sort(), ['positionDataCompact']);
    assert.deepEqual(select, { id: true, positionDataCompact: true });
    throw uniqueError;
  };
  prisma.position.findUnique = async ({ where, select }) => {
    assert.deepEqual(where, { positionDataCompact: data }, 'race resolution uses only compact identity');
    assert.deepEqual(select, { id: true, positionDataCompact: true });
    return { id: 42, positionDataCompact: encodeNormalizedFenCompact(otherFen) };
  };
  await assert.rejects(findOrCreatePositionByNormalizedFen(fen), /id=42.*Expected.*decoded/);
  prisma.position.findUnique = async () => ({ id: 42, positionDataCompact: null });
  await assert.rejects(findOrCreatePositionByNormalizedFen(fen), /id=42.*NULL/);
  prisma.position.findUnique = async () => null;
  await assert.rejects(findOrCreatePositionByNormalizedFen(fen), error => error.cause === uniqueError && /unique conflict without canonical/.test(error.message));
  const operationalError = new Error('Connection failed');
  prisma.position.create = async () => { throw operationalError; };
  prisma.position.findUnique = async () => { assert.fail('Non-unique failures must not try another lookup'); };
  await assert.rejects(findOrCreatePositionByNormalizedFen(fen), error => error === operationalError);
} finally {
  prisma.position.create = originalCreate;
  prisma.position.findUnique = originalLookup;
}
console.log('Compact storage decoding, map identity, unexpected decode, race and error-boundary tests passed.');
