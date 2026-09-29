import { Account, Operation, BalanceStatus } from './types';

/** Solde courant = solde de départ + revenus − dépenses du compte. */
export function computeAccountBalance(
  account: Account,
  operations: Operation[],
): number {
  let bal = account.openingBalance;
  for (const op of operations) {
    if (op.accountId !== account.id) continue;
    if (op.type === 'revenu') bal += op.amount;
    else bal -= op.amount;
  }
  return bal;
}

export function computeAllBalances(
  accounts: Account[],
  operations: Operation[],
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const a of accounts) {
    result[a.id] = computeAccountBalance(a, operations);
  }
  return result;
}

/**
 * Alert solde négatif uniquement au passage sous zéro.
 * Si déjà négatif et déjà alerté, pas de nouvel alert.
 * Si on remonte >= 0, on retire la clé pour permettre un futur franchissement.
 */
export function evaluateNegativeCrossing(
  accountId: string,
  previousBalance: number,
  newBalance: number,
  alertsShown: string[],
): { status: BalanceStatus; nextAlertsShown: string[] } {
  const isNegative = newBalance < 0;
  const wasNegative = previousBalance < 0;
  let next = [...alertsShown];
  let justCrossed = false;

  if (!isNegative) {
    next = next.filter((id) => id !== accountId);
  } else if (!wasNegative && isNegative) {
    // Franchissement
    if (!next.includes(accountId)) {
      justCrossed = true;
      next.push(accountId);
    }
  }
  // déjà négatif : pas de nouvel alert

  return {
    status: { accountId, balance: newBalance, isNegative, justCrossed },
    nextAlertsShown: next,
  };
}

export function monthTotals(
  operations: Operation[],
  monthKey: string,
): { totalIncome: number; totalExpense: number; balance: number } {
  let totalIncome = 0;
  let totalExpense = 0;
  for (const op of operations) {
    if (op.date.slice(0, 7) !== monthKey) continue;
    if (op.type === 'revenu') totalIncome += op.amount;
    else totalExpense += op.amount;
  }
  return {
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense,
  };
}
