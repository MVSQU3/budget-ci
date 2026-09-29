import { deleteMeta, getMeta, setMeta } from '../data/syncRepository';

const SECURE_KEY = 'budgetci_sync_secret';
const FALLBACK_KEY = 'sync_secret_fallback';

export async function readSecret(): Promise<string | null> {
  try {
    const SecureStore = await import('expo-secure-store');
    if (await SecureStore.isAvailableAsync()) {
      const value = await SecureStore.getItemAsync(SECURE_KEY);
      if (value) return value;
    }
  } catch {
    // Secours SQLite si le coffre chiffré est indisponible.
  }
  return getMeta(FALLBACK_KEY);
}

export async function saveSecret(secret: string): Promise<void> {
  try {
    const SecureStore = await import('expo-secure-store');
    if (await SecureStore.isAvailableAsync()) {
      await SecureStore.setItemAsync(SECURE_KEY, secret);
      await deleteMeta(FALLBACK_KEY);
      return;
    }
  } catch {
    // Secours ci-dessous.
  }
  await setMeta(FALLBACK_KEY, secret);
}
