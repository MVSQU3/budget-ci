import { SYNC_EPOCH, LEGACY_SYNC_EPOCH } from '../../sync/clock';
import {
  filterOperationsByPeriod,
  formatDaySectionLabel,
  formatOperationTime,
  formatTransactionSubline,
  groupOperationsByDay,
} from '../transactions';

const now = new Date(2026, 9, 2, 15, 0, 0);

function op(id: string, date: string) {
  return { id, date };
}

describe('filterOperationsByPeriod', () => {
  const operations = [
    op('today', '2026-10-02'),
    op('yesterday', '2026-10-01'),
    op('week-start', '2026-09-26'),
    op('before-week', '2026-09-25'),
    op('future', '2026-10-03'),
    op('month-end', '2026-10-31'),
    op('prev-month', '2026-09-30'),
    op('older', '2025-12-01'),
  ];

  it('Tout garde toutes les opérations', () => {
    expect(filterOperationsByPeriod(operations, 'all', now)).toEqual(operations);
  });

  it('Aujourd’hui ne garde que le jour courant', () => {
    expect(filterOperationsByPeriod(operations, 'today', now).map((item) => item.id)).toEqual([
      'today',
    ]);
  });

  it('7 jours inclut aujourd’hui et les six jours précédents', () => {
    expect(filterOperationsByPeriod(operations, 'days7', now).map((item) => item.id)).toEqual([
      'today',
      'yesterday',
      'week-start',
      'prev-month',
    ]);
  });

  it('Ce mois suit le mois calendaire courant, pas un autre mois affiché', () => {
    expect(filterOperationsByPeriod(operations, 'month', now).map((item) => item.id)).toEqual([
      'today',
      'yesterday',
      'future',
      'month-end',
    ]);
  });
});

describe('groupOperationsByDay', () => {
  it('regroupe par jour, du plus récent au plus ancien', () => {
    const groups = groupOperationsByDay(
      [
        op('a', '2026-10-02'),
        op('c', '2026-10-01'),
        op('b', '2026-10-02'),
        op('d', '2026-09-30'),
        op('e', '2025-10-02'),
      ],
      now,
    );
    expect(groups.map((group) => group.date)).toEqual([
      '2026-10-02',
      '2026-10-01',
      '2026-09-30',
      '2025-10-02',
    ]);
    expect(groups[0]?.items.map((item) => item.id)).toEqual(['b', 'a']);
    expect(groups.map((group) => group.label)).toEqual([
      'Aujourd’hui',
      'Hier',
      'Mercredi 30 septembre',
      'Jeudi 2 octobre 2025',
    ]);
  });

  it('laisse un jour illisible tel quel', () => {
    expect(formatDaySectionLabel('pas-une-date', now)).toBe('pas-une-date');
  });
});

describe('formatTransactionSubline', () => {
  it('assemble heure et note', () => {
    const createdAt = '2026-10-02T14:32:00.000Z';
    const time = formatOperationTime(createdAt);
    expect(time).toBe(
      `${String(new Date(createdAt).getHours()).padStart(2, '0')}:${String(
        new Date(createdAt).getMinutes(),
      ).padStart(2, '0')}`,
    );
    expect(
      formatTransactionSubline({
        createdAt,
        note: 'Marché',
        label: 'Courses',
        accountName: 'Espèces',
      }),
    ).toBe(`${time} · Marché`);
  });

  it('retombe sur le libellé quand la note est vide', () => {
    expect(
      formatTransactionSubline({
        createdAt: null,
        note: '  ',
        label: 'Taxi',
        accountName: 'Orange Money',
      }),
    ).toBe('Taxi');
  });

  it('ignore les horloges de repli et n’affiche le compte que sans texte', () => {
    expect(formatOperationTime(SYNC_EPOCH)).toBeNull();
    expect(formatOperationTime(LEGACY_SYNC_EPOCH)).toBeNull();
    expect(formatOperationTime('pas-une-date')).toBeNull();
    expect(
      formatTransactionSubline({
        createdAt: SYNC_EPOCH,
        note: '',
        label: '',
        accountName: 'Espèces',
      }),
    ).toBe('Espèces');
  });
});
