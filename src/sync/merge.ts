import { OperationType } from '../domain/types';
import { shouldApplyRemote } from './lww';
import {
  mapAccountFromApi,
  mapAccountToApi,
  mapCategoryFromApi,
  mapCategoryToApi,
  mapOperationFromApi,
  mapOperationToApi,
} from './map';
import {
  ApiAccount,
  ApiCategory,
  ApiOperation,
  SyncAccountRecord,
  SyncCategoryRecord,
  SyncOperationRecord,
} from './types';

export function dirtyPushPayload(local: {
  accounts: SyncAccountRecord[];
  categories: SyncCategoryRecord[];
  operations: SyncOperationRecord[];
}): {
  accounts: ReturnType<typeof mapAccountToApi>[];
  categories: ReturnType<typeof mapCategoryToApi>[];
  operations: ReturnType<typeof mapOperationToApi>[];
} {
  return {
    accounts: local.accounts.filter((row) => row.dirty).map(mapAccountToApi),
    categories: local.categories.filter((row) => row.dirty).map(mapCategoryToApi),
    operations: local.operations.filter((row) => row.dirty).map(mapOperationToApi),
  };
}

export function planAccountWrites(
  local: SyncAccountRecord[],
  remote: ApiAccount[],
): SyncAccountRecord[] {
  const byId = new Map(local.map((row) => [row.id, row]));
  const writes: SyncAccountRecord[] = [];
  for (const row of remote) {
    const mapped = mapAccountFromApi(row);
    if (!mapped) continue;
    if (!shouldApplyRemote(byId.get(row.id), mapped.updatedAt)) continue;
    writes.push(mapped);
  }
  return writes;
}

export function planCategoryWrites(
  local: SyncCategoryRecord[],
  remote: ApiCategory[],
): SyncCategoryRecord[] {
  const byId = new Map(local.map((row) => [row.id, row]));
  const writes: SyncCategoryRecord[] = [];
  for (const row of remote) {
    const current = byId.get(row.id);
    const mapped = mapCategoryFromApi(row, current);
    if (!mapped) continue;
    if (!shouldApplyRemote(current, mapped.updatedAt)) continue;
    writes.push(mapped);
  }
  return writes;
}

export function categoryTypeMap(
  local: SyncCategoryRecord[],
  planned: SyncCategoryRecord[],
): Map<string, OperationType> {
  const types = new Map<string, OperationType>();
  for (const row of local) types.set(row.id, row.type);
  for (const row of planned) types.set(row.id, row.type);
  return types;
}

export function planOperationWrites(
  local: SyncOperationRecord[],
  remote: ApiOperation[],
  types: Map<string, OperationType>,
  accountIds: Set<string>,
): SyncOperationRecord[] {
  const byId = new Map(local.map((row) => [row.id, row]));
  const writes: SyncOperationRecord[] = [];
  for (const row of remote) {
    if (!accountIds.has(row.accountId) || !types.has(row.categoryId)) continue;
    const mapped = mapOperationFromApi(row, types.get(row.categoryId) ?? null);
    if (!mapped) continue;
    if (!shouldApplyRemote(byId.get(row.id), mapped.updatedAt)) continue;
    writes.push(mapped);
  }
  return writes;
}
