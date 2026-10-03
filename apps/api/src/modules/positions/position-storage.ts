import { decodeNormalizedFenCompact, encodeNormalizedFenCompact } from 'chess-domain';

export const positionIdentitySelect = { id: true, positionDataCompact: true } as const;

type StoredPositionIdentity = { id: number; positionDataCompact: Uint8Array | null };

/** Reversible compact bytes are the only persisted Position identity. */
export function compactPositionIdentity(normalizedFen: string): Uint8Array<ArrayBuffer> {
  const data = encodeNormalizedFenCompact(normalizedFen);
  if (decodeNormalizedFenCompact(data) !== normalizedFen) {
    throw new Error(`Position compact invariant failed: input is not canonical: ${normalizedFen}`);
  }
  return new Uint8Array(data);
}

export function compactPositionMapKey(data: Uint8Array): string {
  return Buffer.from(data).toString('hex');
}

export function normalizedFenFromPosition(position: StoredPositionIdentity, expectedNormalizedFen?: string): string {
  try {
    const data = position.positionDataCompact;
    if (data === null) throw new Error('NULL positionDataCompact');
    const normalizedFen = decodeNormalizedFenCompact(data);
    if (expectedNormalizedFen !== undefined && normalizedFen !== expectedNormalizedFen) {
      throw new Error(`Expected ${expectedNormalizedFen}, decoded ${normalizedFen}`);
    }
    return normalizedFen;
  } catch (error) {
    throw new Error(`Position compact invariant failed: id=${position.id}: ${String(error)}`);
  }
}

/** Hydrate the existing domain shape without leaking storage bytes or extra ID fields. */
export function hydratePositionFen<T extends StoredPositionIdentity>(position: T) {
  const { id, positionDataCompact, ...rest } = position;
  return { ...rest, normalizedFen: normalizedFenFromPosition({ id, positionDataCompact }) };
}

export type PositionFen<T extends StoredPositionIdentity> = ReturnType<typeof hydratePositionFen<T>>;
