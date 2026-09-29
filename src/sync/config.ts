export const DEFAULT_SYNC_API_BASE_URL = 'https://budget-ci-sync.vercel.app';

function normalizeBaseUrl(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  return trimmed.replace(/\/$/, '');
}

/**
 * Priorité : EXPO_PUBLIC_SYNC_API_URL, puis extra.syncApiBaseUrl, puis le défaut.
 * Aucun secret dans cette config.
 */
export function resolveSyncApiBaseUrl(
  env: string | undefined,
  extra: string | undefined,
): string {
  return (
    normalizeBaseUrl(env) ??
    normalizeBaseUrl(extra) ??
    DEFAULT_SYNC_API_BASE_URL
  );
}

async function readExpoExtra(): Promise<string | undefined> {
  try {
    const Constants = (await import('expo-constants')).default;
    const value = Constants.expoConfig?.extra?.syncApiBaseUrl;
    return typeof value === 'string' ? value : undefined;
  } catch {
    return undefined;
  }
}

export async function getSyncApiBaseUrl(): Promise<string> {
  return resolveSyncApiBaseUrl(
    process.env.EXPO_PUBLIC_SYNC_API_BASE_URL ??
      process.env.EXPO_PUBLIC_SYNC_API_URL,
    await readExpoExtra(),
  );
}
