import { newId } from '../utils/id';
import {
  computeAccountBalance,
  evaluateNegativeCrossing,
  monthTotals,
} from '../domain/balances';
import {
  computeCategorySpend,
  evaluateCeilingCrossing,
  findCeiling,
} from '../domain/ceilings';
import {
  createAccount,
  renameAccount,
  resolveAccountRemoval,
} from '../domain/accounts';
import {
  createCategory,
  renameCategory,
  resolveCategoryRemoval,
} from '../domain/categories';
import { buildOperation, buildUpdatedOperation } from '../domain/operations';
import {
  Account,
  AlertState,
  Category,
  CeilingStatus,
  MonthlyCeiling,
  Operation,
  OperationType,
} from '../domain/types';
import * as repo from '../data/repositories';
import { getDb } from '../data/database';
import { seedIfNeeded } from '../data/seed';
import { toMonthKey } from '../domain/dates';

export type MutationAlerts = {
  negative: { accountName: string; balance: number }[];
  ceilings: { categoryName: string; spent: number; ceiling: number }[];
};

export type AppSnapshot = {
  accounts: Account[];
  categories: Category[];
  operations: Operation[];
  ceilings: MonthlyCeiling[];
  balances: Record<string, number>;
  alertState: AlertState;
};

export async function initApp(): Promise<AppSnapshot> {
  const db = await getDb();
  await seedIfNeeded(db);
  return loadSnapshot();
}

export async function loadSnapshot(): Promise<AppSnapshot> {
  const [accounts, categories, operations, ceilings, alertState] =
    await Promise.all([
      repo.listAccounts(),
      repo.listCategories(),
      repo.listOperations(),
      repo.listCeilings(),
      repo.getAlertState(),
    ]);
  const balances: Record<string, number> = {};
  for (const a of accounts) {
    balances[a.id] = computeAccountBalance(a, operations);
  }
  return { accounts, categories, operations, ceilings, balances, alertState };
}

function collectAlertsForAccounts(
  accountIds: string[],
  beforeOps: Operation[],
  afterOps: Operation[],
  accounts: Account[],
  alertState: AlertState,
): { alerts: MutationAlerts['negative']; next: string[] } {
  let nextNeg = [...alertState.negativeBalanceAlertsShown];
  const alerts: MutationAlerts['negative'] = [];
  for (const accountId of [...new Set(accountIds)]) {
    const account = accounts.find((a) => a.id === accountId);
    if (!account) continue;
    const prevBal = computeAccountBalance(account, beforeOps);
    const newBal = computeAccountBalance(account, afterOps);
    const { status, nextAlertsShown } = evaluateNegativeCrossing(
      accountId,
      prevBal,
      newBal,
      nextNeg,
    );
    nextNeg = nextAlertsShown;
    if (status.justCrossed) {
      alerts.push({ accountName: account.name, balance: newBal });
    }
  }
  return { alerts, next: nextNeg };
}

function collectCeilingAlerts(
  touched: { monthKey: string; categoryId: string }[],
  beforeOps: Operation[],
  afterOps: Operation[],
  ceilings: MonthlyCeiling[],
  categories: Category[],
  alertState: AlertState,
): { alerts: MutationAlerts['ceilings']; next: string[] } {
  let nextCeil = [...alertState.ceilingAlertsShown];
  const alerts: MutationAlerts['ceilings'] = [];
  const seen = new Set<string>();
  for (const t of touched) {
    const key = `${t.monthKey}:${t.categoryId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const cat = categories.find((c) => c.id === t.categoryId);
    if (!cat || cat.type !== 'depense') continue;
    const ceiling = findCeiling(ceilings, t.monthKey, t.categoryId);
    const prevSpent = computeCategorySpend(beforeOps, t.monthKey, t.categoryId);
    const newSpent = computeCategorySpend(afterOps, t.monthKey, t.categoryId);
    const { status, nextAlertsShown } = evaluateCeilingCrossing(
      t.monthKey,
      t.categoryId,
      prevSpent,
      newSpent,
      ceiling,
      nextCeil,
    );
    nextCeil = nextAlertsShown;
    if (status.justCrossed && status.ceiling !== null) {
      alerts.push({
        categoryName: cat.name,
        spent: newSpent,
        ceiling: status.ceiling,
      });
    }
  }
  return { alerts, next: nextCeil };
}

async function persistAlerts(
  alertState: AlertState,
  nextNeg: string[],
  nextCeil: string[],
): Promise<AlertState> {
  const next: AlertState = {
    negativeBalanceAlertsShown: nextNeg,
    ceilingAlertsShown: nextCeil,
  };
  await repo.saveAlertState(next);
  return next;
}

export async function addOperation(input: {
  type: OperationType;
  amount: number;
  date: string;
  label: string;
  categoryId: string;
  accountId: string;
}): Promise<{ snapshot: AppSnapshot; alerts: MutationAlerts }> {
  const snap = await loadSnapshot();
  const account = snap.accounts.find((a) => a.id === input.accountId);
  const category = snap.categories.find((c) => c.id === input.categoryId);
  if (!account) throw new Error('Compte introuvable');
  if (!category) throw new Error('Catégorie introuvable');
  const op = buildOperation(newId('op'), input, account, category);
  const beforeOps = snap.operations;
  const afterOps = [op, ...beforeOps];
  await repo.upsertOperation(op);

  const neg = collectAlertsForAccounts(
    [op.accountId],
    beforeOps,
    afterOps,
    snap.accounts,
    snap.alertState,
  );
  const ceil = collectCeilingAlerts(
    op.type === 'depense'
      ? [{ monthKey: toMonthKey(op.date), categoryId: op.categoryId }]
      : [],
    beforeOps,
    afterOps,
    snap.ceilings,
    snap.categories,
    snap.alertState,
  );
  await persistAlerts(snap.alertState, neg.next, ceil.next);
  const snapshot = await loadSnapshot();
  return { snapshot, alerts: { negative: neg.alerts, ceilings: ceil.alerts } };
}

export async function updateOperation(
  id: string,
  input: {
    type: OperationType;
    amount: number;
    date: string;
    label: string;
    categoryId: string;
    accountId: string;
  },
): Promise<{ snapshot: AppSnapshot; alerts: MutationAlerts }> {
  const snap = await loadSnapshot();
  const existing = snap.operations.find((o) => o.id === id);
  if (!existing) throw new Error('Opération introuvable');
  const account = snap.accounts.find((a) => a.id === input.accountId);
  const category = snap.categories.find((c) => c.id === input.categoryId);
  if (!account) throw new Error('Compte introuvable');
  if (!category) throw new Error('Catégorie introuvable');
  const { previous, next } = buildUpdatedOperation(
    existing,
    input,
    account,
    category,
  );
  const beforeOps = snap.operations;
  const afterOps = beforeOps.map((o) => (o.id === id ? next : o));
  await repo.upsertOperation(next);

  const accountIds = [previous.accountId, next.accountId];
  const touched: { monthKey: string; categoryId: string }[] = [];
  if (previous.type === 'depense') {
    touched.push({
      monthKey: toMonthKey(previous.date),
      categoryId: previous.categoryId,
    });
  }
  if (next.type === 'depense') {
    touched.push({
      monthKey: toMonthKey(next.date),
      categoryId: next.categoryId,
    });
  }
  const neg = collectAlertsForAccounts(
    accountIds,
    beforeOps,
    afterOps,
    snap.accounts,
    snap.alertState,
  );
  const ceil = collectCeilingAlerts(
    touched,
    beforeOps,
    afterOps,
    snap.ceilings,
    snap.categories,
    snap.alertState,
  );
  await persistAlerts(snap.alertState, neg.next, ceil.next);
  const snapshot = await loadSnapshot();
  return { snapshot, alerts: { negative: neg.alerts, ceilings: ceil.alerts } };
}

export async function removeOperation(
  id: string,
): Promise<{ snapshot: AppSnapshot; alerts: MutationAlerts }> {
  const snap = await loadSnapshot();
  const existing = snap.operations.find((o) => o.id === id);
  if (!existing) throw new Error('Opération introuvable');
  const beforeOps = snap.operations;
  const afterOps = beforeOps.filter((o) => o.id !== id);
  await repo.deleteOperation(id);

  const neg = collectAlertsForAccounts(
    [existing.accountId],
    beforeOps,
    afterOps,
    snap.accounts,
    snap.alertState,
  );
  const ceil = collectCeilingAlerts(
    existing.type === 'depense'
      ? [
          {
            monthKey: toMonthKey(existing.date),
            categoryId: existing.categoryId,
          },
        ]
      : [],
    beforeOps,
    afterOps,
    snap.ceilings,
    snap.categories,
    snap.alertState,
  );
  await persistAlerts(snap.alertState, neg.next, ceil.next);
  const snapshot = await loadSnapshot();
  return { snapshot, alerts: { negative: neg.alerts, ceilings: ceil.alerts } };
}

export async function addAccount(
  name: string,
  openingBalance: number = 0,
): Promise<AppSnapshot> {
  const account = createAccount(newId('acc'), name, openingBalance);
  await repo.upsertAccount(account);
  return loadSnapshot();
}

export async function renameAccountById(
  id: string,
  name: string,
): Promise<AppSnapshot> {
  const snap = await loadSnapshot();
  const account = snap.accounts.find((a) => a.id === id);
  if (!account) throw new Error('Compte introuvable');
  await repo.upsertAccount(renameAccount(account, name));
  return loadSnapshot();
}

export async function archiveOrDeleteAccount(id: string): Promise<AppSnapshot> {
  const snap = await loadSnapshot();
  const account = snap.accounts.find((a) => a.id === id);
  if (!account) throw new Error('Compte introuvable');
  const result = resolveAccountRemoval(account, snap.operations);
  if (result.action === 'delete') await repo.deleteAccount(id);
  else await repo.upsertAccount(result.account);
  return loadSnapshot();
}

export async function addCategory(
  name: string,
  type: OperationType,
  color: string,
  icon: string,
): Promise<AppSnapshot> {
  const cat = createCategory(newId('cat'), name, type, color, icon);
  await repo.upsertCategory(cat);
  return loadSnapshot();
}

export async function renameCategoryById(
  id: string,
  name: string,
): Promise<AppSnapshot> {
  const snap = await loadSnapshot();
  const cat = snap.categories.find((c) => c.id === id);
  if (!cat) throw new Error('Catégorie introuvable');
  await repo.upsertCategory(renameCategory(cat, name));
  return loadSnapshot();
}

export async function deactivateOrDeleteCategory(
  id: string,
): Promise<AppSnapshot> {
  const snap = await loadSnapshot();
  const cat = snap.categories.find((c) => c.id === id);
  if (!cat) throw new Error('Catégorie introuvable');
  const result = resolveCategoryRemoval(cat, snap.operations);
  if (result.action === 'delete') await repo.deleteCategory(id);
  else await repo.upsertCategory(result.category);
  return loadSnapshot();
}

export async function reactivateCategory(id: string): Promise<AppSnapshot> {
  const snap = await loadSnapshot();
  const cat = snap.categories.find((c) => c.id === id);
  if (!cat) throw new Error('Catégorie introuvable');
  await repo.upsertCategory({ ...cat, active: true });
  return loadSnapshot();
}

export async function setCeiling(
  monthKey: string,
  categoryId: string,
  amount: number,
): Promise<AppSnapshot> {
  if (!Number.isInteger(amount) || amount < 0) {
    throw new Error('Le plafond doit être un entier >= 0');
  }
  const snap = await loadSnapshot();
  const existing = snap.ceilings.find(
    (c) => c.monthKey === monthKey && c.categoryId === categoryId,
  );
  const ceiling: MonthlyCeiling = {
    id: existing?.id ?? newId('ceil'),
    monthKey,
    categoryId,
    amount,
  };
  await repo.upsertCeiling(ceiling);

  // Recalcule éventuel franchissement après définition du plafond
  const spent = computeCategorySpend(snap.operations, monthKey, categoryId);
  const { status, nextAlertsShown } = evaluateCeilingCrossing(
    monthKey,
    categoryId,
    0,
    spent,
    amount,
    snap.alertState.ceilingAlertsShown,
  );
  // Si on définit un plafond déjà dépassé, on considère le franchissement
  // (alerte une fois). previousSpent=0 simule « pas encore évalué ».
  let nextCeil = nextAlertsShown;
  if (!status.justCrossed && status.exceeded) {
    // déjà dans la liste ou juste ajouté
  }
  await persistAlerts(
    snap.alertState,
    snap.alertState.negativeBalanceAlertsShown,
    nextCeil,
  );
  return loadSnapshot();
}

export function getMonthView(
  snap: AppSnapshot,
  monthKey: string,
): {
  totals: ReturnType<typeof monthTotals>;
  operations: Operation[];
  ceilingStatuses: CeilingStatus[];
} {
  const operations = snap.operations.filter(
    (o) => o.date.slice(0, 7) === monthKey,
  );
  const totals = monthTotals(snap.operations, monthKey);
  const expenseCats = snap.categories.filter((c) => c.type === 'depense');
  const ceilingStatuses: CeilingStatus[] = expenseCats.map((cat) => {
    const ceiling = findCeiling(snap.ceilings, monthKey, cat.id);
    const spent = computeCategorySpend(snap.operations, monthKey, cat.id);
    const exceeded = ceiling !== null && spent > ceiling;
    return {
      categoryId: cat.id,
      ceiling,
      spent,
      exceeded,
      justCrossed: false,
    };
  });
  return { totals, operations, ceilingStatuses };
}
