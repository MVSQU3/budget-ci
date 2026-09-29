import {
  computeAccountBalance,
  evaluateNegativeCrossing,
  monthTotals,
} from '../balances';
import { Account, Operation } from '../types';

const account: Account = {
  id: 'a1',
  name: 'Espèces',
  openingBalance: 1000,
  archived: false,
};

function op(partial: Partial<Operation> & Pick<Operation, 'id' | 'type' | 'amount'>): Operation {
  return {
    date: '2026-09-15',
    label: 'x',
    categoryId: 'c1',
    accountId: 'a1',
    ...partial,
  };
}

describe('computeAccountBalance', () => {
  it('retourne le solde de départ sans opérations', () => {
    expect(computeAccountBalance(account, [])).toBe(1000);
  });

  it('ajoute les revenus et soustrait les dépenses', () => {
    const ops = [
      op({ id: '1', type: 'revenu', amount: 500 }),
      op({ id: '2', type: 'depense', amount: 200 }),
    ];
    expect(computeAccountBalance(account, ops)).toBe(1300);
  });

  it('ignore les opérations d’autres comptes', () => {
    const ops = [op({ id: '1', type: 'depense', amount: 200, accountId: 'other' })];
    expect(computeAccountBalance(account, ops)).toBe(1000);
  });

  it('autorise un solde négatif', () => {
    const ops = [op({ id: '1', type: 'depense', amount: 1500 })];
    expect(computeAccountBalance(account, ops)).toBe(-500);
  });
});

describe('evaluateNegativeCrossing', () => {
  it('alerte uniquement au passage sous zéro', () => {
    const r = evaluateNegativeCrossing('a1', 100, -50, []);
    expect(r.status.justCrossed).toBe(true);
    expect(r.status.isNegative).toBe(true);
    expect(r.nextAlertsShown).toContain('a1');
  });

  it('ne ré-alerte pas si déjà négatif', () => {
    const r = evaluateNegativeCrossing('a1', -50, -80, ['a1']);
    expect(r.status.justCrossed).toBe(false);
    expect(r.status.isNegative).toBe(true);
  });

  it('retire l’alerte quand le solde remonte >= 0', () => {
    const r = evaluateNegativeCrossing('a1', -10, 20, ['a1']);
    expect(r.status.isNegative).toBe(false);
    expect(r.nextAlertsShown).not.toContain('a1');
  });

  it('n’alerte pas si on reste positif', () => {
    const r = evaluateNegativeCrossing('a1', 100, 50, []);
    expect(r.status.justCrossed).toBe(false);
    expect(r.nextAlertsShown).toEqual([]);
  });
});

describe('monthTotals', () => {
  it('calcule revenus, dépenses et solde du mois', () => {
    const ops = [
      op({ id: '1', type: 'revenu', amount: 1000, date: '2026-09-01' }),
      op({ id: '2', type: 'depense', amount: 300, date: '2026-09-10' }),
      op({ id: '3', type: 'depense', amount: 100, date: '2026-08-10' }),
    ];
    expect(monthTotals(ops, '2026-09')).toEqual({
      totalIncome: 1000,
      totalExpense: 300,
      balance: 700,
    });
  });
});
