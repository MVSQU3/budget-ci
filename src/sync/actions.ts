import {
  countDirty,
  countVisibleEntities,
  getMeta,
  markVisibleDirty,
  restampVisibleRows,
  setMeta,
} from '../data/syncRepository';
import { pullAll, registerVault } from './client';
import { isSyncCode, isVaultId, normalizeSyncCode } from './code';
import { getSyncApiBaseUrl } from './config';
import { nowIso } from './clock';
import { syncIfEnabled } from './engine';
import { isDeviceOnline } from './online';
import { readSecret, saveSecret } from './secretStore';
import { SyncScreenState } from './types';

export async function readSyncState(): Promise<SyncScreenState> {
  const enabled = (await getMeta('sync_enabled')) === '1';
  const [vaultId, lastSyncAt, lastError, counts, pending, code] = await Promise.all([
    getMeta('sync_vault_id'),
    getMeta('sync_last_at'),
    getMeta('sync_last_error'),
    countVisibleEntities(),
    countDirty(),
    readSecret(),
  ]);
  return {
    enabled,
    vaultId,
    code,
    lastSyncAt: lastSyncAt || null,
    lastError: lastError || null,
    counts,
    pending,
  };
}

export async function connectWithCode(code: string): Promise<void> {
  const normalized = normalizeSyncCode(code);
  if (!isSyncCode(normalized)) {
    throw new Error('Le code doit contenir 8 caractères alphanumériques.');
  }
  if (!(await isDeviceOnline())) {
    throw new Error('Appareil hors ligne.');
  }
  const current = await readSecret();
  const vaultId = await getMeta('sync_vault_id');
  if (current && vaultId && current === normalized) {
    await setMeta('sync_enabled', '1');
    await syncIfEnabled();
    return;
  }
  const baseUrl = await getSyncApiBaseUrl();
  const created = await registerVault(baseUrl, normalized);
  await saveSecret(normalized);
  await setMeta('sync_vault_id', created.vaultId);
  await setMeta('sync_enabled', '1');
  await setMeta('sync_last_error', '');
  await restampVisibleRows(nowIso());
  await syncIfEnabled();
}

export async function joinWithCode(code: string, vaultId: string): Promise<void> {
  const normalized = normalizeSyncCode(code);
  const vault = vaultId.trim();
  if (!isSyncCode(normalized)) {
    throw new Error('Le code doit contenir 8 caractères alphanumériques.');
  }
  if (!isVaultId(vault)) {
    throw new Error('Identifiant de coffre invalide.');
  }
  if (!(await isDeviceOnline())) {
    throw new Error('Appareil hors ligne.');
  }
  const baseUrl = await getSyncApiBaseUrl();
  await pullAll({ baseUrl, vaultId: vault, secret: normalized });
  await saveSecret(normalized);
  await setMeta('sync_vault_id', vault);
  await setMeta('sync_enabled', '1');
  await setMeta('sync_last_error', '');
  await markVisibleDirty();
  await syncIfEnabled();
}

export async function changeSyncCode(code: string): Promise<void> {
  const normalized = normalizeSyncCode(code);
  if (!isSyncCode(normalized)) {
    throw new Error('Le code doit contenir 8 caractères alphanumériques.');
  }
  if ((await getMeta('sync_enabled')) !== '1') {
    throw new Error('Activez d’abord la synchronisation.');
  }
  if (!(await isDeviceOnline())) {
    throw new Error('Appareil hors ligne.');
  }
  const baseUrl = await getSyncApiBaseUrl();
  const created = await registerVault(baseUrl, normalized);
  await saveSecret(normalized);
  await setMeta('sync_vault_id', created.vaultId);
  await setMeta('sync_last_error', '');
  await restampVisibleRows(nowIso());
  await syncIfEnabled();
}

export async function disableSync(): Promise<void> {
  await setMeta('sync_enabled', '0');
  await setMeta('sync_last_error', '');
}

export async function syncNow(): Promise<void> {
  if ((await getMeta('sync_enabled')) !== '1') {
    throw new Error('La synchronisation est désactivée.');
  }
  if (!(await isDeviceOnline())) {
    throw new Error('Appareil hors ligne.');
  }
  await syncIfEnabled();
  const error = await getMeta('sync_last_error');
  if (error) throw new Error(error);
}
