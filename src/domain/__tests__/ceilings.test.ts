import {
  computeCategorySpend,
  evaluateCeilingCrossing,
  findCeiling,
} from '../ceilings';
import { MonthlyCeiling, Operation } from '../types';

const ops: Operation[] = [
  {
    id: '1',
    type: 'depense',
    amount: 400,
    date: '2026-09-05',
    label: 'courses',
    categoryId: 'cat-courses',
    accountId: 'a1',
  },
  {
    id: '2',
    type: 'depense',
    amount: 200,
    date: '2026-09-12',
    label: 'courses 2',
    categoryId: 'cat-courses',
    accountId: 'a1',
  },
  {
    id: '3',
    type: 'depense',
    amount: 100,
    date: '2026-08-12',
    label: 'août',
    categoryId: 'cat-courses',
    accountId: 'a1',
  },
  {
    id: '4',
    type: 'revenu',
    amount: 500,
    date: '2026-09-01',
    label: 'salaire',
    categoryId: 'cat-sal',
    accountId: 'a1',
  },
];

describe('computeCategorySpend', () => {
  it('somme les dépenses de la catégorie pour le mois', () => {
    expect(computeCategorySpend(ops, '2026-09', 'cat-courses')).toBe(600);
  });
});

describe('evaluateCeilingCrossing', () => {
  it('alerte une fois au franchissement', () => {
    const r = evaluateCeilingCrossing('2026-09', 'cat-courses', 400, 600, 500, []);
    expect(r.status.exceeded).toBe(true);
    expect(r.status.justCrossed).toBe(true);
    expect(r.nextAlertsShown).toContain('2026-09:cat-courses');
  });

  it('ne ré-alerte pas si déjà au-delà', () => {
    const r = evaluateCeilingCrossing(
      '2026-09',
      'cat-courses',
      600,
      700,
      500,
      ['2026-09:cat-courses'],
    );
    expect(r.status.justCrossed).toBe(false);
    expect(r.status.exceeded).toBe(true);
  });

  it('pas d’exceeded sans plafond', () => {
    const r = evaluateCeilingCrossing('2026-09', 'cat-courses', 0, 900, null, []);
    expect(r.status.exceeded).toBe(false);
    expect(r.status.justCrossed).toBe(false);
  });

  it('retire l’alerte si on repasse sous le plafond', () => {
    const r = evaluateCeilingCrossing(
      '2026-09',
      'cat-courses',
      600,
      400,
      500,
      ['2026-09:cat-courses'],
    );
    expect(r.status.exceeded).toBe(false);
    expect(r.nextAlertsShown).not.toContain('2026-09:cat-courses');
  });
});

describe('findCeiling', () => {
  const ceilings: MonthlyCeiling[] = [
    { id: '1', monthKey: '2026-09', categoryId: 'cat-courses', amount: 500 },
  ];
  it('trouve le plafond du mois', () => {
    expect(findCeiling(ceilings, '2026-09', 'cat-courses')).toBe(500);
  });
  it('retourne null si absent', () => {
    expect(findCeiling(ceilings, '2026-10', 'cat-courses')).toBeNull();
  });
});
