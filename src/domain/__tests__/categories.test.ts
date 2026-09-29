import {
  canDeleteCategory,
  resolveCategoryRemoval,
  assertCategoryAcceptsEntry,
} from '../categories';
import { Category, Operation } from '../types';

const cat: Category = {
  id: 'c1',
  name: 'Courses',
  type: 'depense',
  color: '#f00',
  icon: 'cart',
  active: true,
};

describe('resolveCategoryRemoval', () => {
  it('supprime si aucune opération', () => {
    expect(resolveCategoryRemoval(cat, []).action).toBe('delete');
  });

  it('désactive s’il existe des opérations', () => {
    const ops: Operation[] = [
      {
        id: '1',
        type: 'depense',
        amount: 10,
        date: '2026-09-01',
        label: 'x',
        categoryId: 'c1',
        accountId: 'a1',
      },
    ];
    const r = resolveCategoryRemoval(cat, ops);
    expect(r.action).toBe('deactivate');
    if (r.action === 'deactivate') expect(r.category.active).toBe(false);
  });
});

describe('assertCategoryAcceptsEntry', () => {
  it('refuse catégorie inactive', () => {
    expect(() =>
      assertCategoryAcceptsEntry({ ...cat, active: false }, 'depense'),
    ).toThrow(/désactivée/);
  });
  it('refuse un type incompatible', () => {
    expect(() => assertCategoryAcceptsEntry(cat, 'revenu')).toThrow(/même type/);
  });
  it('accepte catégorie active du bon type', () => {
    expect(() => assertCategoryAcceptsEntry(cat, 'depense')).not.toThrow();
  });
});

describe('canDeleteCategory', () => {
  it('true sans opérations', () => {
    expect(canDeleteCategory('c1', [])).toBe(true);
  });
});
