import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const API_BASE_URL_KEY = 'settings.apiBaseUrl';

type Extra = {
  defaultApiBaseUrl?: string;
};

export function defaultApiBaseUrl(): string {
  const extra = Constants.expoConfig?.extra as Extra | undefined;
  return extra?.defaultApiBaseUrl ?? 'https://YOUR_RENDER_API_HOST/api';
}

export async function getApiBaseUrl(): Promise<string> {
  const stored = await AsyncStorage.getItem(API_BASE_URL_KEY);
  return normalizeApiBaseUrl(stored || defaultApiBaseUrl());
}

export async function setApiBaseUrl(value: string): Promise<void> {
  await AsyncStorage.setItem(API_BASE_URL_KEY, normalizeApiBaseUrl(value));
}

export async function resetApiBaseUrl(): Promise<string> {
  const value = defaultApiBaseUrl();
  await AsyncStorage.setItem(API_BASE_URL_KEY, value);
  return value;
}

export function normalizeApiBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, '');
}

export function healthUrlFromApiBase(apiBaseUrl: string): string {
  return normalizeApiBaseUrl(apiBaseUrl).replace(/\/api\/?$/, '') + '/health';
}
