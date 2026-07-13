function normalizeApiBaseUrl(value: string | undefined): string {
  return (value ?? '').trim().replace(/\/+$/, '');
}

export const mobileConfig = {
  apiBaseUrl: normalizeApiBaseUrl(process.env.EXPO_PUBLIC_API_BASE_URL),
  clerkPublishableKey: (process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? '').trim(),
};

export function missingMobileConfiguration(): string[] {
  const missing: string[] = [];
  if (!mobileConfig.clerkPublishableKey) missing.push('EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY');
  if (!mobileConfig.apiBaseUrl) missing.push('EXPO_PUBLIC_API_BASE_URL');
  return missing;
}
