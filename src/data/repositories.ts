import { getDb } from './database';
import { nowIso } from '../sync/clock';
import {
  Account,
  AlertState,
  Category,
  MonthlyCeiling,
  Operation,
  OperationType,
} from '../domain/types';

/** Horloge écrite par la synchro. Sans cet argument, l'écriture est locale et devient dirty. */
export type SyncWrite = {
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  dirty: boolean;
  note?: string | null;
};

function boolFromInt(v: number): boolean {
  return v === 1;
}

export async function listAccounts(): Promise<Account[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    id: string;
    name: string;
    opening_balance: number;
    archived: number;
  }>('SELECT * FROM accounts WHERE deleted_at IS NULL ORDER BY name COLLATE NOCASE');
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    openingBalance: r.opening_balance,
    archived: boolFromInt(r.archived),
  }));
}

export async function upsertAccount(
  account: Account,
  clock?: SyncWrite,
): Promise<void> {
  const db = await getDb();
  const stamp = nowIso();
  if (clock) {
    await db.runAsync(
      `INSERT INTO accounts (id, name, opening_balance, archived, created_at, updated_at, deleted_at, dirty)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         opening_balance = excluded.opening_balance,
         archived = excluded.archived,
         created_at = excluded.created_at,
         updated_at = excluded.updated_at,
         deleted_at = excluded.deleted_at,
         dirty = excluded.dirty`,
      [
        account.id,
        account.name,
        account.openingBalance,
        account.archived ? 1 : 0,
        clock.createdAt,
        clock.updatedAt,
        clock.deletedAt,
        clock.dirty ? 1 : 0,
      ],
    );
    return;
  }
  await db.runAsync(
    `INSERT INTO accounts (id, name, opening_balance, archived, created_at, updated_at, deleted_at, dirty)
     VALUES (?, ?, ?, ?, ?, ?, NULL, 1)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       opening_balance = excluded.opening_balance,
       archived = excluded.archived,
       updated_at = excluded.updated_at,
       deleted_at = NULL,
       dirty = 1`,
    [account.id, account.name, account.openingBalance, account.archived ? 1 : 0, stamp, stamp],
  );
}

export async function deleteAccount(id: string): Promise<void> {
  const db = await getDb();
  const stamp = nowIso();
  await db.runAsync(
    `UPDATE accounts SET deleted_at = ?, updated_at = ?, dirty = 1
     WHERE id = ? AND deleted_at IS NULL`,
    [stamp, stamp, id],
  );
}

export async function listCategories(): Promise<Category[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    id: string;
    name: string;
    type: OperationType;
    color: string;
    icon: string;
    active: number;
  }>('SELECT * FROM categories WHERE deleted_at IS NULL ORDER BY type, name COLLATE NOCASE');
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    type: r.type,
    color: r.color,
    icon: r.icon,
    active: boolFromInt(r.active),
  }));
}

export async function upsertCategory(
  category: Category,
  clock?: SyncWrite,
): Promise<void> {
  const db = await getDb();
  const stamp = nowIso();
  if (clock) {
    await db.runAsync(
      `INSERT INTO categories (id, name, type, color, icon, active, created_at, updated_at, deleted_at, dirty)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         type = excluded.type,
         color = excluded.color,
         icon = excluded.icon,
         active = excluded.active,
         created_at = excluded.created_at,
         updated_at = excluded.updated_at,
         deleted_at = excluded.deleted_at,
         dirty = excluded.dirty`,
      [
        category.id,
        category.name,
        category.type,
        category.color,
        category.icon,
        category.active ? 1 : 0,
        clock.createdAt,
        clock.updatedAt,
        clock.deletedAt,
        clock.dirty ? 1 : 0,
      ],
    );
    return;
  }
  await db.runAsync(
    `INSERT INTO categories (id, name, type, color, icon, active, created_at, updated_at, deleted_at, dirty)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, 1)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       type = excluded.type,
       color = excluded.color,
       icon = excluded.icon,
       active = excluded.active,
       updated_at = excluded.updated_at,
       deleted_at = NULL,
       dirty = 1`,
    [
      category.id,
      category.name,
      category.type,
      category.color,
      category.icon,
      category.active ? 1 : 0,
      stamp,
      stamp,
    ],
  );
}

export async function deleteCategory(id: string): Promise<void> {
  const db = await getDb();
  const stamp = nowIso();
  await db.runAsync(
    `UPDATE categories SET deleted_at = ?, updated_at = ?, dirty = 1
     WHERE id = ? AND deleted_at IS NULL`,
    [stamp, stamp, id],
  );
}

export async function listOperations(): Promise<Operation[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    id: string;
    type: OperationType;
    amount: number;
    date: string;
    label: string;
    category_id: string;
    account_id: string;
    note: string | null;
    created_at: string | null;
  }>('SELECT * FROM operations WHERE deleted_at IS NULL ORDER BY date DESC, id DESC');
  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    amount: r.amount,
    date: r.date,
    label: r.label,
    categoryId: r.category_id,
    accountId: r.account_id,
    note: r.note,
    createdAt: r.created_at,
  }));
}

export async function upsertOperation(
  op: Operation,
  clock?: SyncWrite,
): Promise<void> {
  const db = await getDb();
  const stamp = nowIso();
  if (clock) {
    await db.runAsync(
      `INSERT INTO operations (
         id, type, amount, date, label, category_id, account_id, note, created_at, updated_at, deleted_at, dirty
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         type = excluded.type,
         amount = excluded.amount,
         date = excluded.date,
         label = excluded.label,
         category_id = excluded.category_id,
         account_id = excluded.account_id,
         note = excluded.note,
         created_at = excluded.created_at,
         updated_at = excluded.updated_at,
         deleted_at = excluded.deleted_at,
         dirty = excluded.dirty`,
      [
        op.id,
        op.type,
        op.amount,
        op.date,
        op.label,
        op.categoryId,
        op.accountId,
        clock.note ?? '',
        clock.createdAt,
        clock.updatedAt,
        clock.deletedAt,
        clock.dirty ? 1 : 0,
      ],
    );
    return;
  }
  await db.runAsync(
    `INSERT INTO operations (
       id, type, amount, date, label, category_id, account_id, note, created_at, updated_at, deleted_at, dirty
     ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, NULL, 1)
     ON CONFLICT(id) DO UPDATE SET
       type = excluded.type,
       amount = excluded.amount,
       date = excluded.date,
       label = excluded.label,
       category_id = excluded.category_id,
       account_id = excluded.account_id,
       updated_at = excluded.updated_at,
       deleted_at = NULL,
       dirty = 1`,
    [op.id, op.type, op.amount, op.date, op.label, op.categoryId, op.accountId, stamp, stamp],
  );
}

export async function deleteOperation(id: string): Promise<void> {
  const db = await getDb();
  const stamp = nowIso();
  await db.runAsync(
    `UPDATE operations SET deleted_at = ?, updated_at = ?, dirty = 1
     WHERE id = ? AND deleted_at IS NULL`,
    [stamp, stamp, id],
  );
}

export async function listCeilings(monthKey?: string): Promise<MonthlyCeiling[]> {
  const db = await getDb();
  const rows = monthKey
    ? await db.getAllAsync<{
        id: string;
        month_key: string;
        category_id: string;
        amount: number;
      }>('SELECT * FROM monthly_ceilings WHERE month_key = ?', [monthKey])
    : await db.getAllAsync<{
        id: string;
        month_key: string;
        category_id: string;
        amount: number;
      }>('SELECT * FROM monthly_ceilings');
  return rows.map((r) => ({
    id: r.id,
    monthKey: r.month_key,
    categoryId: r.category_id,
    amount: r.amount,
  }));
}

export async function upsertCeiling(ceiling: MonthlyCeiling): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO monthly_ceilings (id, month_key, category_id, amount) VALUES (?, ?, ?, ?)
     ON CONFLICT(month_key, category_id) DO UPDATE SET amount = excluded.amount`,
    [ceiling.id, ceiling.monthKey, ceiling.categoryId, ceiling.amount],
  );
}

export async function deleteCeiling(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM monthly_ceilings WHERE id = ?', [id]);
}

export async function getAlertState(): Promise<AlertState> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ key: string; value: string }>(
    'SELECT key, value FROM alert_state',
  );
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return {
    ceilingAlertsShown: JSON.parse(map.ceilingAlertsShown || '[]'),
    negativeBalanceAlertsShown: JSON.parse(
      map.negativeBalanceAlertsShown || '[]',
    ),
  };
}

export async function saveAlertState(state: AlertState): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT OR REPLACE INTO alert_state (key, value) VALUES (?, ?)',
    ['ceilingAlertsShown', JSON.stringify(state.ceilingAlertsShown)],
  );
  await db.runAsync(
    'INSERT OR REPLACE INTO alert_state (key, value) VALUES (?, ?)',
    [
      'negativeBalanceAlertsShown',
      JSON.stringify(state.negativeBalanceAlertsShown),
    ],
  );
}
