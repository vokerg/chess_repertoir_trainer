import {
  mobileCourseBundleSchema,
  mobileSessionProbeSchema,
  mobileSyncManifestSchema,
  mobileTrainingAttemptBatchRequestSchema,
  mobileTrainingAttemptBatchResponseSchema,
  type MobileCourseBundleDto,
  type MobileSessionProbeDto,
  type MobileSyncManifestDto,
  type MobileTrainingAttemptBatchRequestDto,
  type MobileTrainingAttemptBatchResponseDto,
} from '@chess-trainer/contracts/mobile-sync';
import { mobileConfig } from '../config/mobile-config';

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

export async function getMobileSessionProbe(token: string): Promise<MobileSessionProbeDto> {
  const payload = await requestJson('/api/mobile-sync/session', token);
  return mobileSessionProbeSchema.parse(payload);
}

export function isMobileDeletionSignal(error: unknown): boolean {
  if (!(error instanceof MobileApiError)) return false;
  const body = error.responseBody;
  if (!body || typeof body !== 'object') return false;
  const record = body as Record<string, unknown>;
  return record['purgeLocalData'] === true
    && (
      record['code'] === 'DATA_LIFECYCLE_DELETION_IN_PROGRESS'
      || record['code'] === 'DATA_LIFECYCLE_IDENTITY_DELETED'
    );
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

export async function postMobileTrainingAttempts(
  request: MobileTrainingAttemptBatchRequestDto,
  token: string,
): Promise<MobileTrainingAttemptBatchResponseDto> {
  const body = mobileTrainingAttemptBatchRequestSchema.parse(request);
  const payload = await requestJson('/api/mobile-sync/training-attempts', token, {
    method: 'POST',
    body,
  });
  return mobileTrainingAttemptBatchResponseSchema.parse(payload);
}

type RequestOptions = {
  method?: 'GET' | 'POST';
  body?: unknown;
};

async function requestJson(
  path: string,
  token: string,
  options: RequestOptions = {},
): Promise<unknown> {
  if (!mobileConfig.apiBaseUrl) {
    throw new MobileApiError('EXPO_PUBLIC_API_BASE_URL is not configured.', null);
  }

  const requestUrl = resolveApiUrl(path);
  const method = options.method ?? 'GET';
  let response: Response;
  try {
    response = await fetch(requestUrl, {
      method,
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
        ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
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
