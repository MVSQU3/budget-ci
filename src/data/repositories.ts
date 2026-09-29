import { getDb } from './database';
import {
  Account,
  AlertState,
  Category,
  MonthlyCeiling,
  Operation,
  OperationType,
} from '../domain/types';

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
  }>('SELECT * FROM accounts ORDER BY name COLLATE NOCASE');
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    openingBalance: r.opening_balance,
    archived: boolFromInt(r.archived),
  }));
}

export async function upsertAccount(account: Account): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO accounts (id, name, opening_balance, archived) VALUES (?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET name = excluded.name, opening_balance = excluded.opening_balance, archived = excluded.archived`,
    [account.id, account.name, account.openingBalance, account.archived ? 1 : 0],
  );
}

export async function deleteAccount(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM accounts WHERE id = ?', [id]);
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
  }>('SELECT * FROM categories ORDER BY type, name COLLATE NOCASE');
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    type: r.type,
    color: r.color,
    icon: r.icon,
    active: boolFromInt(r.active),
  }));
}

export async function upsertCategory(category: Category): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO categories (id, name, type, color, icon, active) VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET name = excluded.name, type = excluded.type, color = excluded.color, icon = excluded.icon, active = excluded.active`,
    [
      category.id,
      category.name,
      category.type,
      category.color,
      category.icon,
      category.active ? 1 : 0,
    ],
  );
}

export async function deleteCategory(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM categories WHERE id = ?', [id]);
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
  }>('SELECT * FROM operations ORDER BY date DESC, id DESC');
  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    amount: r.amount,
    date: r.date,
    label: r.label,
    categoryId: r.category_id,
    accountId: r.account_id,
  }));
}

export async function upsertOperation(op: Operation): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO operations (id, type, amount, date, label, category_id, account_id) VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET type = excluded.type, amount = excluded.amount, date = excluded.date, label = excluded.label, category_id = excluded.category_id, account_id = excluded.account_id`,
    [op.id, op.type, op.amount, op.date, op.label, op.categoryId, op.accountId],
  );
}

export async function deleteOperation(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM operations WHERE id = ?', [id]);
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
