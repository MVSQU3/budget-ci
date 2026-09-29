import { buildOperation, buildUpdatedOperation, validateOperationInput } from '../operations';
import { Account, Category, Operation } from '../types';

const account: Account = {
  id: 'a1',
  name: 'Espèces',
  openingBalance: 0,
  archived: false,
};

const category: Category = {
  id: 'c1',
  name: 'Courses',
  type: 'depense',
  color: '#0a0',
  icon: 'cart',
  active: true,
};

describe('validateOperationInput', () => {
  it('refuse montant non entier ou <= 0', () => {
    expect(() =>
      validateOperationInput({
        type: 'depense',
        amount: 0,
        date: '2026-09-01',
        label: 'x',
        categoryId: 'c1',
        accountId: 'a1',
      }),
    ).toThrow(/entier/);
    expect(() =>
      validateOperationInput({
        type: 'depense',
        amount: 10.5,
        date: '2026-09-01',
        label: 'x',
        categoryId: 'c1',
        accountId: 'a1',
      }),
    ).toThrow(/entier/);
  });
});

describe('buildOperation', () => {
  it('crée une opération valide', () => {
    const op = buildOperation(
      'op1',
      {
        type: 'depense',
        amount: 2500,
        date: '2026-09-15',
        label: ' Marché ',
        categoryId: 'c1',
        accountId: 'a1',
      },
      account,
      category,
    );
    expect(op.label).toBe('Marché');
    expect(op.amount).toBe(2500);
  });

  it('refuse compte archivé', () => {
    expect(() =>
      buildOperation(
        'op1',
        {
          type: 'depense',
          amount: 100,
          date: '2026-09-15',
          label: 'x',
          categoryId: 'c1',
          accountId: 'a1',
        },
        { ...account, archived: true },
        category,
      ),
    ).toThrow(/archivé/);
  });
});

describe('buildUpdatedOperation - règle des éléments archivés', () => {
  const existing: Operation = {
    id: 'op1',
    type: 'depense',
    amount: 100,
    date: '2026-09-15',
    label: 'Ancien libellé',
    categoryId: 'c1',
    accountId: 'a1',
  };

  it('autorise la modification du libellé et du montant sur le même compte archivé', () => {
    const result = buildUpdatedOperation(
      existing,
      {
        type: 'depense',
        amount: 250,
        date: existing.date,
        label: ' Nouveau libellé ',
        categoryId: 'c1',
        accountId: 'a1',
      },
      { ...account, archived: true },
      category,
    );

    expect(result.next.label).toBe('Nouveau libellé');
    expect(result.next.amount).toBe(250);
  });

  it('refuse de changer vers un autre compte archivé', () => {
    expect(() =>
      buildUpdatedOperation(
        existing,
        {
          type: 'depense',
          amount: 100,
          date: existing.date,
          label: existing.label,
          categoryId: 'c1',
          accountId: 'a2',
        },
        { ...account, id: 'a2', name: 'Autre compte', archived: true },
        category,
      ),
    ).toThrow(/archivé/);
  });

  it('autorise la modification du libellé et du montant sur la même catégorie inactive', () => {
    const result = buildUpdatedOperation(
      existing,
      {
        type: 'depense',
        amount: 300,
        date: existing.date,
        label: ' Catégorie conservée ',
        categoryId: 'c1',
        accountId: 'a1',
      },
      account,
      { ...category, active: false },
    );

    expect(result.next.label).toBe('Catégorie conservée');
    expect(result.next.amount).toBe(300);
  });

  it('refuse de changer vers une autre catégorie inactive', () => {
    expect(() =>
      buildUpdatedOperation(
        existing,
        {
          type: 'depense',
          amount: 100,
          date: existing.date,
          label: existing.label,
          categoryId: 'c2',
          accountId: 'a1',
        },
        account,
        { ...category, id: 'c2', name: 'Autre catégorie', active: false },
      ),
    ).toThrow(/désactivée/);
  });
});