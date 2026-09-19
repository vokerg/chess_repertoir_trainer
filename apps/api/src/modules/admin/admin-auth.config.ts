import type { AuthConfig } from '../../auth/auth.config';

const MAX_ALLOWLIST_SIZE = 50;
const MIN_ACTOR_KEY_SECRET_BYTES = 32;

export interface DisabledAdminAuthConfig {
  mode: 'disabled';
}

export interface ClerkSubjectAllowlistAdminAuthConfig {
  mode: 'clerk-subject-allowlist';
  subjectAllowlist: ReadonlySet<string>;
  actorKeySecret: Uint8Array;
  actorKeyVersion: number;
}

/** Explicit app-factory-only mode for isolated non-production tests. */
export interface TestAdminAuthConfig {
  mode: 'test';
  userIds: ReadonlySet<number>;
  actorKeySecret: Uint8Array;
  actorKeyVersion: number;
}

export type AdminAuthConfig =
  | DisabledAdminAuthConfig
  | ClerkSubjectAllowlistAdminAuthConfig
  | TestAdminAuthConfig;

function positiveInteger(name: string, value: string | undefined, fallback: number): number {
  const parsed = Number(value ?? fallback);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new Error(`${name} must be a positive integer`);
  }
  return parsed;
}

function actorKeySecret(): Uint8Array {
  const value = process.env['ADMIN_ACTOR_KEY_SECRET']?.trim();
  if (!value) {
    throw new Error('ADMIN_ACTOR_KEY_SECRET is required when administrator authorization is enabled');
  }
  const bytes = Buffer.from(value, 'utf8');
  if (bytes.byteLength < MIN_ACTOR_KEY_SECRET_BYTES) {
    throw new Error(`ADMIN_ACTOR_KEY_SECRET must contain at least ${MIN_ACTOR_KEY_SECRET_BYTES} UTF-8 bytes`);
  }
  return bytes;
}

function subjectAllowlist(): ReadonlySet<string> {
  const raw = process.env['ADMIN_CLERK_SUBJECT_ALLOWLIST']?.trim();
  if (!raw) {
    throw new Error('ADMIN_CLERK_SUBJECT_ALLOWLIST is required when ADMIN_AUTH_MODE=clerk-subject-allowlist');
  }

  const values = raw.split(',').map((value) => value.trim());
  if (values.some((value) => value.length === 0)) {
    throw new Error('ADMIN_CLERK_SUBJECT_ALLOWLIST must not contain blank subjects');
  }
  if (values.length > MAX_ALLOWLIST_SIZE) {
    throw new Error(`ADMIN_CLERK_SUBJECT_ALLOWLIST must contain at most ${MAX_ALLOWLIST_SIZE} subjects`);
  }
  const unique = new Set(values);
  if (unique.size !== values.length) {
    throw new Error('ADMIN_CLERK_SUBJECT_ALLOWLIST must not contain duplicate subjects');
  }
  for (const value of unique) {
    if (value.length > 256 || /\s/.test(value)) {
      throw new Error('ADMIN_CLERK_SUBJECT_ALLOWLIST contains a malformed subject');
    }
  }
  return unique;
}

export function validateAdminAuthConfig(authConfig: AuthConfig, adminConfig: AdminAuthConfig): void {
  if (adminConfig.mode === 'disabled') return;

  if (adminConfig.mode === 'test') {
    if (process.env['NODE_ENV'] === 'production') {
      throw new Error('Administrator test authorization is not allowed when NODE_ENV=production');
    }
    return;
  }

  if (authConfig.mode !== 'clerk') {
    throw new Error('Administrator authorization requires AUTH_MODE=clerk');
  }
}

export function loadAdminAuthConfig(authConfig: AuthConfig): AdminAuthConfig {
  const mode = process.env['ADMIN_AUTH_MODE']?.trim() || 'disabled';
  let config: AdminAuthConfig;

  if (mode === 'disabled') {
    config = { mode: 'disabled' };
  } else if (mode === 'clerk-subject-allowlist') {
    config = {
      mode,
      subjectAllowlist: subjectAllowlist(),
      actorKeySecret: actorKeySecret(),
      actorKeyVersion: positiveInteger('ADMIN_ACTOR_KEY_VERSION', process.env['ADMIN_ACTOR_KEY_VERSION'], 1),
    };
  } else {
    throw new Error('ADMIN_AUTH_MODE must be either disabled or clerk-subject-allowlist');
  }

  validateAdminAuthConfig(authConfig, config);
  return config;
}
