export interface VerifiedSessionContext {
  provider: 'clerk';
  subject: string;
  sessionId: string;
  tokenVersion: number;
  issuedAt: Date;
  jwtId: string;
  authorizedParty?: string;
  factorVerificationAge?: readonly [number, number];
  reverificationId?: string;
}

function integer(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isSafeInteger(value)) return value;
  if (typeof value === 'string' && /^-?\d+$/.test(value)) {
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) ? parsed : undefined;
  }
  return undefined;
}

function nonEmptyString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function factorVerificationAge(value: unknown): readonly [number, number] | undefined {
  if (!Array.isArray(value) || value.length !== 2) return undefined;
  const first = integer(value[0]);
  const second = integer(value[1]);
  if (first === undefined || second === undefined || first < -1 || second < -1) return undefined;
  return [first, second];
}

export function normalizeVerifiedSessionContext(
  payload: Record<string, unknown>,
  subject: string,
): VerifiedSessionContext | null {
  const sessionId = nonEmptyString(payload['sid']);
  const tokenVersion = integer(payload['v']);
  const issuedAtSeconds = integer(payload['iat']);
  const jwtId = nonEmptyString(payload['jti']);

  if (!sessionId || tokenVersion === undefined || tokenVersion < 1 || issuedAtSeconds === undefined || issuedAtSeconds < 1 || !jwtId) {
    return null;
  }

  const issuedAt = new Date(issuedAtSeconds * 1000);
  if (Number.isNaN(issuedAt.getTime())) return null;

  const authorizedParty = nonEmptyString(payload['azp']);
  const fva = factorVerificationAge(payload['fva']);
  const reverificationId = nonEmptyString(payload['reverification_id']);

  return {
    provider: 'clerk',
    subject,
    sessionId,
    tokenVersion,
    issuedAt,
    jwtId,
    ...(authorizedParty ? { authorizedParty } : {}),
    ...(fva ? { factorVerificationAge: fva } : {}),
    ...(reverificationId ? { reverificationId } : {}),
  };
}
