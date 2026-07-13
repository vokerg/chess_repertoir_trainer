import {
  mobileCourseBundleSchema,
  mobileSyncManifestSchema,
  type MobileCourseBundleDto,
  type MobileSyncManifestDto,
} from '@chess-trainer/contracts/mobile-sync';
import { mobileConfig } from '../config/mobile-config';
import { mobileLogger } from '../diagnostics/mobile-logger';

export class MobileApiError extends Error {
  constructor(
    message: string,
    readonly status: number | null,
    readonly responseBody: unknown = null,
    readonly requestUrl: string | null = null,
  ) {
    super(message);
    this.name = 'MobileApiError';
  }
}

export async function getMobileManifest(token: string): Promise<MobileSyncManifestDto> {
  const payload = await requestJson('/api/mobile-sync/manifest', token);
  return mobileSyncManifestSchema.parse(payload);
}

export async function getMobileCourseBundle(
  courseId: number,
  token: string,
): Promise<MobileCourseBundleDto> {
  const payload = await requestJson(`/api/mobile-sync/courses/${courseId}`, token);
  return mobileCourseBundleSchema.parse(payload);
}

async function requestJson(path: string, token: string): Promise<unknown> {
  if (!mobileConfig.apiBaseUrl) {
    throw new MobileApiError('EXPO_PUBLIC_API_BASE_URL is not configured.', null);
  }

  const requestUrl = resolveApiUrl(path);
  let response: Response;
  try {
    response = await fetch(requestUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
  } catch (error) {
    throw new MobileApiError(
      `Could not reach ${requestUrl}: ${error instanceof Error ? error.message : 'network request failed'}`,
      null,
      null,
      requestUrl,
    );
  }

  const text = await response.text();
  const body = parseResponseBody(text);
  if (!response.ok) {
    const authDiagnostics = response.headers.get('x-clerk-auth-diagnostics');
    if (response.status === 401 && authDiagnostics) {
      mobileLogger.warn('mobile-api', 'API authentication rejected request', {
        diagnostics: parseResponseBody(authDiagnostics),
      });
    }
    const responseMessage = readErrorMessage(body) ?? 'API request failed';
    throw new MobileApiError(
      `${responseMessage} (HTTP ${response.status}).`,
      response.status,
      body,
      requestUrl,
    );
  }
  return body;
}

function resolveApiUrl(path: string): string {
  if (mobileConfig.apiBaseUrl.endsWith('/api') && path.startsWith('/api/')) {
    return `${mobileConfig.apiBaseUrl}${path.slice('/api'.length)}`;
  }
  return `${mobileConfig.apiBaseUrl}${path}`;
}

function parseResponseBody(text: string): unknown {
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function readErrorMessage(body: unknown): string | null {
  if (!body || typeof body !== 'object') return typeof body === 'string' ? body : null;
  const record = body as Record<string, unknown>;
  const value = record['error'] ?? record['message'];
  return typeof value === 'string' ? value : null;
}
