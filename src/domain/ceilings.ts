import { MonthlyCeiling, Operation, CeilingStatus } from './types';

export function computeCategorySpend(
  operations: Operation[],
  monthKey: string,
  categoryId: string,
): number {
  let spent = 0;
  for (const op of operations) {
    if (op.type !== 'depense') continue;
    if (op.date.slice(0, 7) !== monthKey) continue;
    if (op.categoryId !== categoryId) continue;
    spent += op.amount;
  }
  return spent;
}

export function ceilingKey(monthKey: string, categoryId: string): string {
  return `${monthKey}:${categoryId}`;
}

/**
 * Franchissement plafond : alert une seule fois au passage au-delà.
 * Indicateur exceeded tant que spent > ceiling.
 * Remonter sous le plafond retire la clé d'alerte (nouveau franchissement possible).
 */
export function evaluateCeilingCrossing(
  monthKey: string,
  categoryId: string,
  previousSpent: number,
  newSpent: number,
  ceiling: number | null,
  alertsShown: string[],
): { status: CeilingStatus; nextAlertsShown: string[] } {
  const key = ceilingKey(monthKey, categoryId);
  const hasCeiling = ceiling !== null && ceiling !== undefined;
  const exceeded = hasCeiling && newSpent > (ceiling as number);
  const wasExceeded = hasCeiling && previousSpent > (ceiling as number);
  let next = [...alertsShown];
  let justCrossed = false;

  if (!hasCeiling || !exceeded) {
    next = next.filter((k) => k !== key);
  } else if (!wasExceeded && exceeded) {
    if (!next.includes(key)) {
      justCrossed = true;
      next.push(key);
    }
  }

  return {
    status: {
      categoryId,
      ceiling: hasCeiling ? (ceiling as number) : null,
      spent: newSpent,
      exceeded: !!exceeded,
      justCrossed,
    },
    nextAlertsShown: next,
  };
}

export function findCeiling(
  ceilings: MonthlyCeiling[],
  monthKey: string,
  categoryId: string,
): number | null {
  const c = ceilings.find(
    (x) => x.monthKey === monthKey && x.categoryId === categoryId,
  );
  return c ? c.amount : null;
}
