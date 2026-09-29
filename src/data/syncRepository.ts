import { getDb } from './database';
import { upsertAccount, upsertCategory, upsertOperation } from './repositories';
import {
  SyncAccountRecord,
  SyncCategoryRecord,
  SyncOperationRecord,
} from '../sync/types';
import { OperationType } from '../domain/types';

const TABLES = ['accounts', 'categories', 'operations'] as const;
type SyncTable = (typeof TABLES)[number];

function assertTable(table: string): asserts table is SyncTable {
  if (table !== 'accounts' && table !== 'categories' && table !== 'operations') {
    throw new Error('Table inconnue');
  }
}

export async function getMeta(key: string): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM meta WHERE key = ?',
    [key],
  );
  return row?.value ?? null;
}

export async function setMeta(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)',
    [key, value],
  );
}

export async function deleteMeta(key: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM meta WHERE key = ?', [key]);
}

export async function markVisibleDirty(): Promise<void> {
  const db = await getDb();
  for (const table of TABLES) {
    await db.runAsync(`UPDATE ${table} SET dirty = 1 WHERE deleted_at IS NULL`);
  }
}

export async function restampVisibleRows(updatedAt: string): Promise<void> {
  const db = await getDb();
  for (const table of TABLES) {
    await db.runAsync(
      `UPDATE ${table} SET updated_at = ?, dirty = 1 WHERE deleted_at IS NULL`,
      [updatedAt],
    );
  }
}

export async function clearDirtyIfUnchanged(
  table: SyncTable,
  id: string,
  updatedAt: string,
): Promise<void> {
  assertTable(table);
  const db = await getDb();
  await db.runAsync(
    `UPDATE ${table} SET dirty = 0 WHERE id = ? AND updated_at = ?`,
    [id, updatedAt],
  );
}

export async function countVisibleEntities(): Promise<{
  accounts: number;
  categories: number;
  operations: number;
}> {
  const db = await getDb();
  const count = async (table: SyncTable) => {
    const row = await db.getFirstAsync<{ n: number }>(
      `SELECT COUNT(*) AS n FROM ${table} WHERE deleted_at IS NULL`,
    );
    return Number(row?.n ?? 0);
  };
  return {
    accounts: await count('accounts'),
    categories: await count('categories'),
    operations: await count('operations'),
  };
}

export async function countDirty(): Promise<number> {
  const db = await getDb();
  let total = 0;
  for (const table of TABLES) {
    const row = await db.getFirstAsync<{ n: number }>(
      `SELECT COUNT(*) AS n FROM ${table} WHERE dirty = 1`,
    );
    total += Number(row?.n ?? 0);
  }
  return total;
}

type AccountRow = {
  id: string;
  name: string;
  opening_balance: number;
  archived: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  dirty: number;
};

type CategoryRow = {
  id: string;
  name: string;
  type: OperationType;
  color: string;
  icon: string;
  active: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  dirty: number;
};

type OperationRow = {
  id: string;
  type: OperationType;
  amount: number;
  date: string;
  label: string;
  category_id: string;
  account_id: string;
  note: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  dirty: number;
};

export async function listSyncAccounts(): Promise<SyncAccountRecord[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<AccountRow>('SELECT * FROM accounts');
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    openingBalance: row.opening_balance,
    archived: row.archived === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
    dirty: row.dirty === 1,
  }));
}

export async function listSyncCategories(): Promise<SyncCategoryRecord[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<CategoryRow>('SELECT * FROM categories');
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    type: row.type,
    color: row.color,
    icon: row.icon,
    active: row.active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
    dirty: row.dirty === 1,
  }));
}

export async function listSyncOperations(): Promise<SyncOperationRecord[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<OperationRow>('SELECT * FROM operations');
  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    amount: row.amount,
    date: row.date,
    label: row.label,
    categoryId: row.category_id,
    accountId: row.account_id,
    note: row.note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
    dirty: row.dirty === 1,
  }));
}

export async function applySyncAccounts(rows: SyncAccountRecord[]): Promise<void> {
  for (const row of rows) {
    await upsertAccount(
      {
        id: row.id,
        name: row.name,
        openingBalance: row.openingBalance,
        archived: row.archived,
      },
      {
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        deletedAt: row.deletedAt,
        dirty: row.dirty,
      },
    );
  }
}

export async function applySyncCategories(
  rows: SyncCategoryRecord[],
): Promise<void> {
  for (const row of rows) {
    await upsertCategory(
      {
        id: row.id,
        name: row.name,
        type: row.type,
        color: row.color,
        icon: row.icon,
        active: row.active,
      },
      {
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        deletedAt: row.deletedAt,
        dirty: row.dirty,
      },
    );
  }
}

export async function applySyncOperations(
  rows: SyncOperationRecord[],
): Promise<void> {
  for (const row of rows) {
    await upsertOperation(
      {
        id: row.id,
        type: row.type,
        amount: row.amount,
        date: row.date,
        label: row.label,
        categoryId: row.categoryId,
        accountId: row.accountId,
      },
      {
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        deletedAt: row.deletedAt,
        dirty: row.dirty,
        note: row.note,
      },
    );
  }
}
