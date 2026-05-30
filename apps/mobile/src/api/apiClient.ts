import { ApiError, mapApiErrorBody } from './errors';
import { getApiBaseUrl, healthUrlFromApiBase, normalizeApiBaseUrl } from '@/storage/settingsStore';

export type ApiConfig = {
  baseUrl: string;
  token?: string | null;
};

let token: string | null = null;

export function setBearerToken(nextToken: string | null): void {
  token = nextToken;
}

export async function apiGet<T>(path: string): Promise<T> {
  return request<T>('GET', path);
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return request<T>('POST', path, body);
}

export async function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  return request<T>('PATCH', path, body);
}

export async function apiDelete(path: string): Promise<void> {
  await request<void>('DELETE', path);
}

export async function testHealth(apiBaseUrl: string): Promise<{ ok: boolean; body: string }> {
  const response = await fetch(healthUrlFromApiBase(apiBaseUrl), { method: 'GET' });
  const body = await response.text();
  return { ok: response.ok, body };
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const baseUrl = await getApiBaseUrl();
  const response = await fetch(`${normalizeApiBaseUrl(baseUrl)}${withLeadingSlash(path)}`, {
    method,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  }).catch((error: unknown) => {
    throw new ApiError(error instanceof Error ? error.message : 'Network request failed');
  });

  if (response.status === 204) return undefined as T;

  const text = await response.text();
  const parsed = text ? safeJson(text) : null;
  if (!response.ok) {
    throw new ApiError(mapApiErrorBody(parsed), response.status, parsed);
  }
  return parsed as T;
}

function withLeadingSlash(path: string): string {
  return path.startsWith('/') ? path : `/${path}`;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}
