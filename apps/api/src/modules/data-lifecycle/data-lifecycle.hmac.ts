import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

export interface VersionedHmacDigest {
  keyVersion: number;
  digest: string;
}

export interface LifecycleHmacKey {
  version: number;
  secret: string;
}

export class LifecycleHmacKeyring {
  private readonly orderedKeys: LifecycleHmacKey[];

  constructor(keys: LifecycleHmacKey[]) {
    const uniqueVersions = new Set<number>();
    for (const key of keys) {
      if (!Number.isInteger(key.version) || key.version <= 0) {
        throw new Error('Lifecycle HMAC key versions must be positive integers.');
      }
      if (!key.secret.trim()) throw new Error('Lifecycle HMAC secrets must not be empty.');
      if (uniqueVersions.has(key.version)) {
        throw new Error(`Duplicate lifecycle HMAC key version ${key.version}.`);
      }
      uniqueVersions.add(key.version);
    }
    this.orderedKeys = [...keys].sort((left, right) => right.version - left.version);
  }

  get configured(): boolean {
    return this.orderedKeys.length > 0;
  }

  current(value: string, domain: string): VersionedHmacDigest {
    const key = this.orderedKeys[0];
    if (!key) throw new Error(`Lifecycle ${domain} HMAC key is not configured.`);
    return { keyVersion: key.version, digest: hmacDigest(key.secret, domain, value) };
  }

  candidates(value: string, domain: string): VersionedHmacDigest[] {
    return this.orderedKeys.map((key) => ({
      keyVersion: key.version,
      digest: hmacDigest(key.secret, domain, value),
    }));
  }
}

export function loadLifecycleIdentityKeyring(
  env: NodeJS.ProcessEnv = process.env,
): LifecycleHmacKeyring {
  return loadKeyring('DATA_LIFECYCLE_IDENTITY_HMAC', env);
}

export function loadLifecycleAuditKeyring(
  env: NodeJS.ProcessEnv = process.env,
): LifecycleHmacKeyring {
  return loadKeyring('DATA_LIFECYCLE_AUDIT_HMAC', env);
}

export function hashOpaqueLifecycleToken(token: string): string {
  if (!token.trim()) throw new Error('Lifecycle token must not be empty.');
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

export function lifecycleTokenMatches(token: string, expectedHash: string): boolean {
  const actual = Buffer.from(hashOpaqueLifecycleToken(token), 'hex');
  const expected = Buffer.from(expectedHash, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function loadKeyring(prefix: string, env: NodeJS.ProcessEnv): LifecycleHmacKeyring {
  const currentSecret = env[`${prefix}_KEY`]?.trim();
  const versionRaw = env[`${prefix}_KEY_VERSION`]?.trim();
  const previousRaw = env[`${prefix}_PREVIOUS_KEYS`]?.trim();
  const keys: LifecycleHmacKey[] = [];

  if (currentSecret) {
    const version = versionRaw ? Number(versionRaw) : 1;
    if (!Number.isInteger(version) || version <= 0) {
      throw new Error(`${prefix}_KEY_VERSION must be a positive integer.`);
    }
    keys.push({ version, secret: currentSecret });
  } else if (versionRaw) {
    throw new Error(`${prefix}_KEY_VERSION requires ${prefix}_KEY.`);
  }

  if (previousRaw) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(previousRaw);
    } catch {
      throw new Error(`${prefix}_PREVIOUS_KEYS must be a JSON object keyed by version.`);
    }
    if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
      throw new Error(`${prefix}_PREVIOUS_KEYS must be a JSON object keyed by version.`);
    }
    for (const [rawVersion, rawSecret] of Object.entries(parsed)) {
      const version = Number(rawVersion);
      if (!Number.isInteger(version) || version <= 0 || typeof rawSecret !== 'string' || !rawSecret.trim()) {
        throw new Error(`${prefix}_PREVIOUS_KEYS contains an invalid version or secret.`);
      }
      keys.push({ version, secret: rawSecret });
    }
  }

  return new LifecycleHmacKeyring(keys);
}

function hmacDigest(secret: string, domain: string, value: string): string {
  return createHmac('sha256', secret)
    .update(`chess-trainer:${domain}:v1\0`, 'utf8')
    .update(value, 'utf8')
    .digest('hex');
}
