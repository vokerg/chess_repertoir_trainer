import crypto from 'node:crypto';

export function positionKeyForNormalizedFen(normalizedFen: string): Buffer {
  return crypto.createHash('sha256').update(normalizedFen, 'utf8').digest();
}

export function positionKeyHex(positionKey: Buffer | Uint8Array): string {
  return Buffer.from(positionKey).toString('hex');
}

export function assertPositionKeyMatchesFen(input: {
  expectedNormalizedFen: string;
  actualNormalizedFen: string;
  positionKey: Buffer | Uint8Array;
}) {
  if (input.actualNormalizedFen !== input.expectedNormalizedFen) {
    throw new Error(
      `Position key collision or inconsistent position mapping for key ${positionKeyHex(
        input.positionKey,
      )}: expected ${input.expectedNormalizedFen}, got ${input.actualNormalizedFen}`,
    );
  }
}
