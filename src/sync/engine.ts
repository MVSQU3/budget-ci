import {
  applySyncAccounts,
  applySyncCategories,
  applySyncOperations,
  clearDirtyIfUnchanged,
  getMeta,
  listSyncAccounts,
  listSyncCategories,
  listSyncOperations,
  setMeta,
} from '../data/syncRepository';
import { pullAll, pushChanges } from './client';
import { nowIso } from './clock';
import { getSyncApiBaseUrl } from './config';
import { runGuardedSync } from './guard';
import {
  categoryTypeMap,
  dirtyPushPayload,
  planAccountWrites,
  planCategoryWrites,
  planOperationWrites,
} from './merge';
import { isDeviceOnline } from './online';
import { readSecret } from './secretStore';
let queue: Promise<void> = Promise.resolve();

/** Ne contacte le réseau que si la synchro est activée et l'appareil en ligne. */
export function syncIfEnabled(): Promise<void> {
  const run = queue.then(() => runSyncOnce());
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function runSyncOnce(): Promise<void> {
  try {
    const enabled = (await getMeta('sync_enabled')) === '1';
    const secret = enabled ? await readSecret() : null;
    const vaultId = enabled ? await getMeta('sync_vault_id') : null;
    await runGuardedSync({
      enabled: enabled && Boolean(secret && vaultId),
      online: isDeviceOnline,
      sync: async () => {
        await pushAndPull(vaultId as string, secret as string);
        await setMeta('sync_last_at', nowIso());
        await setMeta('sync_last_error', '');
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Synchronisation impossible';
    try {
      await setMeta('sync_last_error', message);
    } catch {
      // La base locale reste utilisable si l'écriture du statut échoue.
    }
  }
}

async function pushAndPull(vaultId: string, secret: string): Promise<void> {
  const baseUrl = await getSyncApiBaseUrl();
  const local = {
    accounts: await listSyncAccounts(),
    categories: await listSyncCategories(),
    operations: await listSyncOperations(),
  };
  const payload = dirtyPushPayload(local);
  const pushedAt = new Map<string, string>();
  for (const row of local.accounts) {
    if (row.dirty) pushedAt.set(`accounts:${row.id}`, row.updatedAt);
  }
  for (const row of local.categories) {
    if (row.dirty) pushedAt.set(`categories:${row.id}`, row.updatedAt);
  }
  for (const row of local.operations) {
    if (row.dirty) pushedAt.set(`operations:${row.id}`, row.updatedAt);
  }

  const hasDirty =
    payload.accounts.length > 0 ||
    payload.categories.length > 0 ||
    payload.operations.length > 0;

  if (hasDirty) {
    const pushed = await pushChanges({
      baseUrl,
      vaultId,
      secret,
      accounts: payload.accounts,
      categories: payload.categories,
      operations: payload.operations,
    });
    await clearApplied('accounts', pushed.applied.accounts, pushedAt);
    await clearApplied('categories', pushed.applied.categories, pushedAt);
    await clearApplied('operations', pushed.applied.operations, pushedAt);
  }

  const remote = await pullAll({ baseUrl, vaultId, secret });
  const fresh = {
    accounts: await listSyncAccounts(),
    categories: await listSyncCategories(),
    operations: await listSyncOperations(),
  };
  const accounts = planAccountWrites(fresh.accounts, remote.accounts);
  const categories = planCategoryWrites(fresh.categories, remote.categories);
  const operations = planOperationWrites(
    fresh.operations,
    remote.operations,
    categoryTypeMap(fresh.categories, categories),
    new Set([
      ...fresh.accounts.map((row) => row.id),
      ...accounts.map((row) => row.id),
    ]),
  );
  await applySyncAccounts(accounts);
  await applySyncCategories(categories);
  await applySyncOperations(operations);
}

async function clearApplied(
  table: 'accounts' | 'categories' | 'operations',
  ids: string[],
  pushedAt: Map<string, string>,
): Promise<void> {
  for (const id of ids) {
    const updatedAt = pushedAt.get(`${table}:${id}`);
    if (!updatedAt) continue;
    await clearDirtyIfUnchanged(table, id, updatedAt);
  }
}
