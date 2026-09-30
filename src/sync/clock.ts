/** Horodatage ISO utilisé pour le last-write-wins. */
export function nowIso(date: Date = new Date()): string {
  return date.toISOString();
}

/**
 * Plancher d'horloge accepté par l'API (`MIN_TIMESTAMP` = 2000-01-01).
 * L'ancienne valeur `1970-01-01T00:00:00.000Z` est rejetée au push
 * (`accounts[0].createdAt est invalide.`).
 */
export const SYNC_EPOCH = '2000-01-01T00:00:00.000Z';

/** Epoch écrit avant l'alignement sur le minimum de l'API. */
export const LEGACY_SYNC_EPOCH = '1970-01-01T00:00:00.000Z';

const MIN_TIMESTAMP_MS = Date.parse(SYNC_EPOCH);

/**
 * Vrai si l'API accepterait cet horodatage : ISO parseable, >= 2000-01-01.
 * Le plancher est inclusif, comme `parseTimestamp` côté serveur.
 */
export function isApiTimestamp(value: string | null | undefined): boolean {
  if (!value) return false;
  const ms = Date.parse(value);
  return Number.isFinite(ms) && ms >= MIN_TIMESTAMP_MS;
}

/**
 * Remplace un horodatage vide ou antérieur à 2000 par `SYNC_EPOCH`.
 * Les horodatages déjà valides pour l'API sont conservés tels quels.
 */
export function rewriteSyncClock(value: string | null | undefined): string {
  if (isApiTimestamp(value)) return value as string;
  return SYNC_EPOCH;
}

/**
 * Prédicat SQLite pour une colonne texte ISO-8601 : vide ou strictement
 * avant `SYNC_EPOCH`. Les valeurs `toISOString()` ont une largeur fixe,
 * donc l'ordre lexicographique coïncide avec l'ordre chronologique.
 * Le placeholder `?` doit être lié à `SYNC_EPOCH`.
 */
export function sqlBeforeSyncEpoch(column: string): string {
  if (!/^[a-z_]+$/.test(column)) {
    throw new Error('Colonne d’horloge invalide');
  }
  return `${column} IS NULL OR ${column} = '' OR ${column} < ?`;
}
