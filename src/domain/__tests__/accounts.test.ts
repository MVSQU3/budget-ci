import {
  canDeleteAccount,
  resolveAccountRemoval,
  assertAccountAcceptsEntry,
  createAccount,
} from '../accounts';
import { Account, Operation } from '../types';

const account: Account = {
  id: 'a1',
  name: 'Espèces',
  openingBalance: 0,
  archived: false,
};

describe('canDeleteAccount / resolveAccountRemoval', () => {
  it('supprime si aucune opération', () => {
    expect(canDeleteAccount('a1', [])).toBe(true);
    expect(resolveAccountRemoval(account, []).action).toBe('delete');
  });

  it('archive s’il existe des opérations', () => {
    const ops: Operation[] = [
      {
        id: '1',
        type: 'depense',
        amount: 10,
        date: '2026-09-01',
        label: 'x',
        categoryId: 'c',
        accountId: 'a1',
      },
    ];
    const r = resolveAccountRemoval(account, ops);
    expect(r.action).toBe('archive');
    if (r.action === 'archive') expect(r.account.archived).toBe(true);
  });
});

describe('assertAccountAcceptsEntry', () => {
  it('refuse un compte archivé', () => {
    expect(() =>
      assertAccountAcceptsEntry({ ...account, archived: true }),
    ).toThrow(/archivé/);
  });
});

describe('createAccount', () => {
  it('crée avec solde entier', () => {
    const a = createAccount('x', 'Banque', 0);
    expect(a.name).toBe('Banque');
    expect(a.openingBalance).toBe(0);
  });
  it('refuse un solde non entier', () => {
    expect(() => createAccount('x', 'Banque', 1.5)).toThrow(/entier/);
  });
});
