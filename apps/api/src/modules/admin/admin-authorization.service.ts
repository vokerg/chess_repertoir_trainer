import { createHmac } from 'node:crypto';
import type { AdminCapability } from '@chess-trainer/contracts/admin';
import type { RequestAuth } from '../../auth/request-auth';
import type { VerifiedSessionContext } from '../../auth/verified-session-context';
import type { AdminAuthConfig } from './admin-auth.config';

const ACTOR_KEY_DOMAIN = 'chess-trainer:admin-read-actor:v1';
const TARGET_KEY_DOMAIN = 'chess-trainer:admin-read-target:v1';
const DIAGNOSTICS_CAPABILITIES = ['ADMIN_DIAGNOSTICS_READ'] as const satisfies readonly AdminCapability[];

export interface AdminPrincipal {
  actorKey: string;
  actorKeyVersion: number;
  capabilities: readonly AdminCapability[];
  sessionId: string | null;
  factorVerificationAge?: readonly [number, number];
  reverificationId?: string;
}

export interface AdminAuthorizationInput {
  auth: RequestAuth | null;
  verifiedSession: VerifiedSessionContext | null;
}

export interface AdminAuthorizationPolicy {
  resolve(input: AdminAuthorizationInput): AdminPrincipal | null;
  targetKey(userId: number): string;
}

function hmac(secret: Uint8Array, version: number, domain: string, value: string): string {
  const digest = createHmac('sha256', secret)
    .update(domain)
    .update('\0')
    .update(value)
    .digest('base64url');
  return `v${version}.${digest}`;
}

function principal(
  secret: Uint8Array,
  version: number,
  subject: string,
  verifiedSession: VerifiedSessionContext | null,
): AdminPrincipal {
  return {
    actorKey: hmac(secret, version, ACTOR_KEY_DOMAIN, subject),
    actorKeyVersion: version,
    capabilities: DIAGNOSTICS_CAPABILITIES,
    sessionId: verifiedSession?.sessionId ?? null,
    ...(verifiedSession?.factorVerificationAge
      ? { factorVerificationAge: verifiedSession.factorVerificationAge }
      : {}),
    ...(verifiedSession?.reverificationId
      ? { reverificationId: verifiedSession.reverificationId }
      : {}),
  };
}

export function hasAdminCapability(
  principalValue: AdminPrincipal,
  capability: AdminCapability,
): boolean {
  return principalValue.capabilities.includes(capability);
}

export function createAdminAuthorizationPolicy(config: AdminAuthConfig): AdminAuthorizationPolicy {
  if (config.mode === 'disabled') {
    return {
      resolve: () => null,
      targetKey: (userId) => `disabled.${userId}`,
    };
  }

  if (config.mode === 'test') {
    return {
      resolve: ({ auth, verifiedSession }) => {
        if (!auth || !config.userIds.has(auth.userId)) return null;
        return principal(
          config.actorKeySecret,
          config.actorKeyVersion,
          `test-user:${auth.userId}`,
          verifiedSession,
        );
      },
      targetKey: (userId) => hmac(
        config.actorKeySecret,
        config.actorKeyVersion,
        TARGET_KEY_DOMAIN,
        `app-user:${userId}`,
      ),
    };
  }

  return {
    resolve: ({ auth, verifiedSession }) => {
      if (!auth || auth.provider !== 'clerk' || !verifiedSession) return null;
      if (verifiedSession.provider !== 'clerk') return null;
      if (verifiedSession.subject !== auth.externalSubject) return null;
      if (!config.subjectAllowlist.has(verifiedSession.subject)) return null;
      return principal(
        config.actorKeySecret,
        config.actorKeyVersion,
        verifiedSession.subject,
        verifiedSession,
      );
    },
    targetKey: (userId) => hmac(
      config.actorKeySecret,
      config.actorKeyVersion,
      TARGET_KEY_DOMAIN,
      `app-user:${userId}`,
    ),
  };
}
