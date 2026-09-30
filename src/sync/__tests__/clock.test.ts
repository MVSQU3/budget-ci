import { mapAccountToApi } from '../map';
import {
  isApiTimestamp,
  LEGACY_SYNC_EPOCH,
  rewriteSyncClock,
  sqlBeforeSyncEpoch,
  SYNC_EPOCH,
} from '../clock';
import { SyncAccountRecord } from '../types';

const API_MIN_MS = Date.parse('2000-01-01T00:00:00.000Z');

/** Même décision que le prédicat SQLite `sqlBeforeSyncEpoch` sur du texte ISO. */
function sqlWouldRewrite(value: string | null): boolean {
  if (value == null || value === '') return true;
  return value < SYNC_EPOCH;
}

function account(createdAt: string, updatedAt: string): SyncAccountRecord {
  return {
    id: 'acc_especes',
    name: 'Espèces',
    openingBalance: 0,
    archived: false,
    createdAt,
    updatedAt,
    deletedAt: null,
    dirty: true,
  };
}

describe('horloge de synchro', () => {
  it('réécrit l’epoch 1970 et tout horodatage avant 2000', () => {
    expect(SYNC_EPOCH).toBe('2000-01-01T00:00:00.000Z');
    expect(LEGACY_SYNC_EPOCH).toBe('1970-01-01T00:00:00.000Z');
    expect(rewriteSyncClock(LEGACY_SYNC_EPOCH)).toBe(SYNC_EPOCH);
    expect(rewriteSyncClock('1999-12-31T23:59:59.999Z')).toBe(SYNC_EPOCH);
    expect(rewriteSyncClock(null)).toBe(SYNC_EPOCH);
    expect(rewriteSyncClock('')).toBe(SYNC_EPOCH);
    expect(rewriteSyncClock(undefined)).toBe(SYNC_EPOCH);
    expect(isApiTimestamp(LEGACY_SYNC_EPOCH)).toBe(false);
    expect(Date.parse(LEGACY_SYNC_EPOCH)).toBeLessThan(API_MIN_MS);
  });

  it('conserve les horodatages déjà acceptés par l’API', () => {
    const shaped = '2026-09-01T12:34:56.789Z';
    expect(isApiTimestamp(shaped)).toBe(true);
    expect(rewriteSyncClock(shaped)).toBe(shaped);
    expect(rewriteSyncClock(SYNC_EPOCH)).toBe(SYNC_EPOCH);
    expect(isApiTimestamp(SYNC_EPOCH)).toBe(true);
    expect(Date.parse(SYNC_EPOCH)).toBe(API_MIN_MS);

    const row = account(shaped, SYNC_EPOCH);
    const api = mapAccountToApi({
      ...row,
      createdAt: rewriteSyncClock(row.createdAt),
      updatedAt: rewriteSyncClock(row.updatedAt),
    });
    expect(api.createdAt).toBe(shaped);
    expect(api.updatedAt).toBe(SYNC_EPOCH);
    expect(Date.parse(api.createdAt)).toBeGreaterThanOrEqual(API_MIN_MS);
    expect(Date.parse(api.updatedAt)).toBeGreaterThanOrEqual(API_MIN_MS);
  });

  it('aligne le prédicat SQL du backfill sur la réécriture des horloges legacy', () => {
    expect(sqlBeforeSyncEpoch('created_at')).toBe(
      "created_at IS NULL OR created_at = '' OR created_at < ?",
    );
    expect(sqlBeforeSyncEpoch('updated_at')).toContain('updated_at < ?');

    const samples: Array<string | null> = [
      null,
      '',
      LEGACY_SYNC_EPOCH,
      '1999-12-31T23:59:59.999Z',
      SYNC_EPOCH,
      '2026-09-29T00:00:00.000Z',
    ];
    for (const sample of samples) {
      const rewritten = rewriteSyncClock(sample);
      if (sqlWouldRewrite(sample)) {
        expect(rewritten).toBe(SYNC_EPOCH);
      } else {
        expect(rewritten).toBe(sample);
      }
    }

    const legacy = account(LEGACY_SYNC_EPOCH, LEGACY_SYNC_EPOCH);
    const repaired = account(
      rewriteSyncClock(legacy.createdAt),
      rewriteSyncClock(legacy.updatedAt),
    );
    const api = mapAccountToApi(repaired);
    expect(api.createdAt).toBe(SYNC_EPOCH);
    expect(api.updatedAt).toBe(SYNC_EPOCH);
    expect(api.createdAt.startsWith('1970-')).toBe(false);
    expect(Date.parse(api.createdAt)).toBeGreaterThanOrEqual(API_MIN_MS);
  });
});
