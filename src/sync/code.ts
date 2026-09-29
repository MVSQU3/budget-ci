export const SYNC_CODE_LENGTH = 8;

/** Sans caractères ambigus (0/O, 1/I/L) pour la saisie sur un second appareil. */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const VAULT_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function generateSyncCode(random: () => number = Math.random): string {
  let code = '';
  for (let index = 0; index < SYNC_CODE_LENGTH; index += 1) {
    const pick = Math.floor(random() * ALPHABET.length);
    code += ALPHABET[pick] ?? 'A';
  }
  return code;
}

export function normalizeSyncCode(input: string): string {
  return input.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, SYNC_CODE_LENGTH);
}

export function isSyncCode(value: string): boolean {
  return /^[A-Z0-9]{8}$/.test(value);
}

export function isVaultId(value: string): boolean {
  return VAULT_ID.test(value.trim());
}

/** Extrait un code à 8 caractères et un vaultId d'un texte partagé. */
export function parseSharedJoinText(raw: string): {
  code?: string;
  vaultId?: string;
} {
  const vaultMatch = raw.match(
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
  );
  const withoutVault = vaultMatch ? raw.replace(vaultMatch[0], ' ') : raw;
  const codeMatch = withoutVault.toUpperCase().match(/\b[A-Z0-9]{8}\b/);
  return {
    code: codeMatch?.[0],
    vaultId: vaultMatch?.[0],
  };
}
