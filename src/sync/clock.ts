/** Horodatage ISO utilisé pour le last-write-wins. */
export function nowIso(date: Date = new Date()): string {
  return date.toISOString();
}

/** Lignes créées avant l'introduction de l'horloge. */
export const SYNC_EPOCH = '1970-01-01T00:00:00.000Z';
