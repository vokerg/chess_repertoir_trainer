export type AuthConfig = DevSingleUserAuthConfig | ClerkAuthConfig;

export interface DevSingleUserAuthConfig {
  mode: 'dev-single-user';
  userId: number;
}

export interface ClerkAuthConfig {
  mode: 'clerk';
  issuer: string;
  jwksUrl: URL;
  audience?: string;
  authorizedParties: string[];
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required when AUTH_MODE=clerk`);
  return value;
}

function parseUrl(name: string, value: string): URL {
  try {
    return new URL(value);
  } catch {
    throw new Error(`${name} must be a valid URL`);
  }
}

export function loadAuthConfig(): AuthConfig {
  const mode = process.env['AUTH_MODE'];

  if (mode === 'dev-single-user') {
    if (process.env['NODE_ENV'] === 'production') {
      throw new Error('AUTH_MODE=dev-single-user is not allowed when NODE_ENV=production');
    }

    const rawUserId = process.env['DEV_SINGLE_USER_ID'] ?? '1';
    const userId = Number(rawUserId);
    if (!Number.isSafeInteger(userId) || userId < 1) {
      throw new Error('DEV_SINGLE_USER_ID must be a positive integer');
    }

    return { mode, userId };
  }

  if (mode === 'clerk') {
    const issuer = requiredEnv('CLERK_JWT_ISSUER');
    const jwksUrl = parseUrl('CLERK_JWKS_URL', requiredEnv('CLERK_JWKS_URL'));
    const authorizedParties = requiredEnv('CLERK_AUTHORIZED_PARTIES')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

    if (authorizedParties.length === 0) {
      throw new Error('CLERK_AUTHORIZED_PARTIES must contain at least one origin');
    }

    return {
      mode,
      issuer,
      jwksUrl,
      audience: process.env['CLERK_JWT_AUDIENCE']?.trim() || undefined,
      authorizedParties,
    };
  }

  throw new Error('AUTH_MODE must be either dev-single-user or clerk');
}
