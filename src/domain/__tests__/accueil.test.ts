import {
  RECENT_OPERATION_LIMIT,
  isCeilingExceeded,
  recentOperations,
  sortOperationsDesc,
  sumBalances,
} from '../accueil';

function op(id: string, date: string) {
  return { id, date };
}

describe('recentOperations', () => {
  const operations = [
    op('a', '2026-10-02'),
    op('c', '2026-10-01'),
    op('b', '2026-10-02'),
    op('f', '2026-09-28'),
    op('d', '2026-09-30'),
    op('e', '2026-09-29'),
  ];

  it('garde les 5 plus récentes, date puis id décroissants', () => {
    expect(RECENT_OPERATION_LIMIT).toBe(5);
    expect(recentOperations(operations).map((item) => item.id)).toEqual([
      'b',
      'a',
      'c',
      'd',
      'e',
    ]);
  });

  it('retourne toute la liste quand elle est plus courte que la limite', () => {
    expect(recentOperations([op('a', '2026-10-01'), op('b', '2026-10-02')])).toEqual([
      op('b', '2026-10-02'),
      op('a', '2026-10-01'),
    ]);
  });

  it('trie la liste complète pour « Tout voir »', () => {
    expect(sortOperationsDesc(operations).map((item) => item.id)).toEqual([
      'b',
      'a',
      'c',
      'd',
      'e',
      'f',
    ]);
  });
});

describe('sumBalances', () => {
  it('additionne les soldes de tous les comptes', () => {
    expect(sumBalances({})).toBe(0);
    expect(sumBalances({ a: 1500, b: -200, c: 40 })).toBe(1340);
  });
});

describe('isCeilingExceeded', () => {
  const statuses = [
    { categoryId: 'food', exceeded: true },
    { categoryId: 'rent', exceeded: false },
  ];

  it('signale un dépassement seulement pour une dépense de cette catégorie', () => {
    expect(isCeilingExceeded({ type: 'depense', categoryId: 'food' }, statuses)).toBe(true);
    expect(isCeilingExceeded({ type: 'depense', categoryId: 'rent' }, statuses)).toBe(false);
    expect(isCeilingExceeded({ type: 'revenu', categoryId: 'food' }, statuses)).toBe(false);
  });
});
