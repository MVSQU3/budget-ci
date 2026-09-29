import { SQLiteDatabase } from 'expo-sqlite';
import { backfillSyncClocks } from './database';

const SEED_FLAG = 'seeded_v1';

function id(prefix: string, slug: string): string {
  return `${prefix}_${slug}`;
}

export async function seedIfNeeded(db: SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM meta WHERE key = ?',
    [SEED_FLAG],
  );
  if (row?.value === '1') return;

  const accounts = [
    { id: id('acc', 'especes'), name: 'Espèces', opening: 0 },
    { id: id('acc', 'orange'), name: 'Orange Money', opening: 0 },
    { id: id('acc', 'banque'), name: 'Compte bancaire', opening: 0 },
  ];

  const revenus = [
    { slug: 'salaire', name: 'Salaire', color: '#2ecc71', icon: '💰' },
    { slug: 'autre', name: 'Autre revenu', color: '#27ae60', icon: '➕' },
  ];

  const depenses = [
    { slug: 'loyer', name: 'Loyer', color: '#e74c3c', icon: '🏠' },
    { slug: 'courses', name: 'Courses', color: '#e67e22', icon: '🛒' },
    { slug: 'transport', name: 'Transport', color: '#3498db', icon: '🚌' },
    { slug: 'telecom', name: 'Téléphone / internet', color: '#9b59b6', icon: '📱' },
    { slug: 'sante', name: 'Santé', color: '#1abc9c', icon: '🏥' },
    { slug: 'loisirs', name: 'Loisirs', color: '#f1c40f', icon: '🎮' },
    { slug: 'dettes', name: 'Dettes / crédit', color: '#c0392b', icon: '💳' },
    { slug: 'autre', name: 'Autre dépense', color: '#7f8c8d', icon: '⋯' },
  ];

  await db.withTransactionAsync(async () => {
    for (const a of accounts) {
      await db.runAsync(
        'INSERT OR IGNORE INTO accounts (id, name, opening_balance, archived) VALUES (?, ?, ?, 0)',
        [a.id, a.name, a.opening],
      );
    }
    for (const c of revenus) {
      await db.runAsync(
        'INSERT OR IGNORE INTO categories (id, name, type, color, icon, active) VALUES (?, ?, ?, ?, ?, 1)',
        [id('cat', `rev_${c.slug}`), c.name, 'revenu', c.color, c.icon],
      );
    }
    for (const c of depenses) {
      await db.runAsync(
        'INSERT OR IGNORE INTO categories (id, name, type, color, icon, active) VALUES (?, ?, ?, ?, ?, 1)',
        [id('cat', `dep_${c.slug}`), c.name, 'depense', c.color, c.icon],
      );
    }
    await db.runAsync(
      'INSERT OR REPLACE INTO alert_state (key, value) VALUES (?, ?)',
      ['ceilingAlertsShown', '[]'],
    );
    await db.runAsync(
      'INSERT OR REPLACE INTO alert_state (key, value) VALUES (?, ?)',
      ['negativeBalanceAlertsShown', '[]'],
    );
    await db.runAsync(
      'INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)',
      [SEED_FLAG, '1'],
    );
  });
  await backfillSyncClocks(db);
}
