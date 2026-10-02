import { OperationType } from './types';

/** Nombre d’opérations affichées dans la section Récent de l’Accueil. */
export const RECENT_OPERATION_LIMIT = 5;

/** Somme des soldes de comptes affichés auparavant dans « Soldes des comptes ». */
export function sumBalances(balances: Record<string, number>): number {
  let total = 0;
  for (const value of Object.values(balances)) total += value;
  return total;
}

type Dated = { date: string; id: string };

/** Plus récentes d’abord : date décroissante, puis id décroissant (comme SQLite). */
export function sortOperationsDesc<T extends Dated>(operations: readonly T[]): T[] {
  return [...operations].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    if (a.id !== b.id) return a.id < b.id ? 1 : -1;
    return 0;
  });
}

export function recentOperations<T extends Dated>(
  operations: readonly T[],
  limit = RECENT_OPERATION_LIMIT,
): T[] {
  return sortOperationsDesc(operations).slice(0, limit);
}

export function isCeilingExceeded(
  operation: { type: OperationType; categoryId: string },
  statuses: readonly { categoryId: string; exceeded: boolean }[],
): boolean {
  return (
    operation.type === 'depense' &&
    statuses.some((status) => status.categoryId === operation.categoryId && status.exceeded)
  );
}
