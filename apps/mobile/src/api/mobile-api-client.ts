import {
  mobileCourseBundleSchema,
  mobileSyncManifestSchema,
  type MobileCourseBundleDto,
  type MobileSyncManifestDto,
} from '@chess-trainer/contracts/mobile-sync';
import { mobileConfig } from '../config/mobile-config';

export class MobileApiError extends Error {
  constructor(
    message: string,
    readonly status: number | null,
    readonly responseBody: unknown = null,
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

  let response: Response;
  try {
    response = await fetch(resolveApiUrl(path), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
  } catch (error) {
    throw new MobileApiError(
      error instanceof Error ? error.message : 'The API could not be reached.',
      null,
    );
  }

  const text = await response.text();
  const body = parseResponseBody(text);
  if (!response.ok) {
    const message = readErrorMessage(body) ?? `API request failed with status ${response.status}.`;
    throw new MobileApiError(message, response.status, body);
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
