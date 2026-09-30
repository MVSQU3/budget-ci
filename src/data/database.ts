import * as SQLite from 'expo-sqlite';
import { sqlBeforeSyncEpoch, SYNC_EPOCH } from '../sync/clock';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = openAndMigrate();
  }
  return dbPromise;
}

async function openAndMigrate(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync('budget-ci.db');
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      opening_balance INTEGER NOT NULL DEFAULT 0,
      archived INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('revenu', 'depense')),
      color TEXT NOT NULL,
      icon TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS operations (
      id TEXT PRIMARY KEY NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('revenu', 'depense')),
      amount INTEGER NOT NULL CHECK (amount > 0),
      date TEXT NOT NULL,
      label TEXT NOT NULL,
      category_id TEXT NOT NULL,
      account_id TEXT NOT NULL,
      FOREIGN KEY (category_id) REFERENCES categories(id),
      FOREIGN KEY (account_id) REFERENCES accounts(id)
    );

    CREATE TABLE IF NOT EXISTS monthly_ceilings (
      id TEXT PRIMARY KEY NOT NULL,
      month_key TEXT NOT NULL,
      category_id TEXT NOT NULL,
      amount INTEGER NOT NULL CHECK (amount >= 0),
      UNIQUE(month_key, category_id),
      FOREIGN KEY (category_id) REFERENCES categories(id)
    );

    CREATE TABLE IF NOT EXISTS alert_state (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
  `);
  await ensureSyncColumns(db);
  await backfillSyncClocks(db);
  return db;
}

const SYNC_TABLES = ['accounts', 'categories', 'operations'] as const;

async function columnNames(
  db: SQLite.SQLiteDatabase,
  table: (typeof SYNC_TABLES)[number],
): Promise<Set<string>> {
  const rows = await db.getAllAsync<{ name: string }>(
    `PRAGMA table_info(${table})`,
  );
  return new Set(rows.map((row) => row.name));
}

async function addColumn(
  db: SQLite.SQLiteDatabase,
  table: (typeof SYNC_TABLES)[number],
  name: string,
  definition: string,
): Promise<void> {
  const columns = await columnNames(db, table);
  if (columns.has(name)) return;
  await db.execAsync(`ALTER TABLE ${table} ADD COLUMN ${definition}`);
}

/** Colonnes d'horloge pour la synchro. Invisibles tant que la synchro est coupée. */
export async function ensureSyncColumns(db: SQLite.SQLiteDatabase): Promise<void> {
  for (const table of SYNC_TABLES) {
    await addColumn(db, table, 'created_at', 'created_at TEXT');
    await addColumn(db, table, 'updated_at', 'updated_at TEXT');
    await addColumn(db, table, 'deleted_at', 'deleted_at TEXT');
    await addColumn(db, table, 'dirty', 'dirty INTEGER NOT NULL DEFAULT 0');
  }
  await addColumn(db, 'operations', 'note', 'note TEXT');
}

export async function backfillSyncClocks(db: SQLite.SQLiteDatabase): Promise<void> {
  for (const table of SYNC_TABLES) {
    await db.runAsync(
      `UPDATE ${table} SET created_at = ? WHERE ${sqlBeforeSyncEpoch('created_at')}`,
      [SYNC_EPOCH, SYNC_EPOCH],
    );
    await db.runAsync(
      `UPDATE ${table} SET updated_at = ? WHERE ${sqlBeforeSyncEpoch('updated_at')}`,
      [SYNC_EPOCH, SYNC_EPOCH],
    );
  }
}

/** Réinitialise le singleton (tests / hot reload). */
export function resetDbSingleton(): void {
  dbPromise = null;
}
