import { sortOperationsDesc } from './accueil';
import {
  currentMonthKey,
  parseISODateLocal,
  shiftISODate,
  todayISO,
  toMonthKey,
} from './dates';
import { LEGACY_SYNC_EPOCH, SYNC_EPOCH } from '../sync/clock';

/** Périodes des pastilles de la liste Transactions. */
export type TransactionPeriod = 'all' | 'today' | 'days7' | 'month';

/** « 7 jours » = aujourd’hui et les 6 jours précédents. */
const ROLLING_DAYS = 7;

const WEEKDAYS = [
  'dimanche',
  'lundi',
  'mardi',
  'mercredi',
  'jeudi',
  'vendredi',
  'samedi',
] as const;

const MONTHS = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
] as const;

type Dated = { date: string; id: string };

export function isOperationInPeriod(
  date: string,
  period: TransactionPeriod,
  now: Date = new Date(),
): boolean {
  if (period === 'all') return true;
  const today = todayISO(now);
  if (period === 'today') return date === today;
  if (period === 'month') return toMonthKey(date) === currentMonthKey(now);
  const start = shiftISODate(today, -(ROLLING_DAYS - 1));
  return date >= start && date <= today;
}

export function filterOperationsByPeriod<T extends { date: string }>(
  operations: readonly T[],
  period: TransactionPeriod,
  now: Date = new Date(),
): T[] {
  return operations.filter((operation) =>
    isOperationInPeriod(operation.date, period, now),
  );
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** Libellé de section : Aujourd’hui, Hier, ou le jour calendaire. */
export function formatDaySectionLabel(isoDate: string, now: Date = new Date()): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return isoDate;
  const today = todayISO(now);
  if (isoDate === today) return 'Aujourd’hui';
  if (isoDate === shiftISODate(today, -1)) return 'Hier';
  const date = parseISODateLocal(isoDate);
  const weekday = capitalize(WEEKDAYS[date.getDay()] ?? '');
  const month = MONTHS[date.getMonth()] ?? '';
  const heading = `${weekday} ${date.getDate()} ${month}`;
  if (date.getFullYear() !== now.getFullYear()) {
    return `${heading} ${date.getFullYear()}`;
  }
  return heading;
}

export type DayGroup<T> = {
  date: string;
  label: string;
  items: T[];
};

/** Regroupe des opérations déjà datées, du jour le plus récent au plus ancien. */
export function groupOperationsByDay<T extends Dated>(
  operations: readonly T[],
  now: Date = new Date(),
): DayGroup<T>[] {
  const groups: DayGroup<T>[] = [];
  for (const operation of sortOperationsDesc(operations)) {
    const last = groups[groups.length - 1];
    if (last && last.date === operation.date) {
      last.items.push(operation);
    } else {
      groups.push({
        date: operation.date,
        label: formatDaySectionLabel(operation.date, now),
        items: [operation],
      });
    }
  }
  return groups;
}

/**
 * Heure locale HH:mm tirée de l’horodatage de création.
 * Les horloges de repli synchro (époque) ne sont pas une heure de transaction.
 */
export function formatOperationTime(createdAt: string | null | undefined): string | null {
  if (!createdAt || createdAt === SYNC_EPOCH || createdAt === LEGACY_SYNC_EPOCH) {
    return null;
  }
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return null;
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Sous-ligne de carte : heure · note.
 * La note de synchro prime ; sinon le libellé saisi. Le compte ne s’affiche
 * que lorsqu’il n’y a ni heure ni texte.
 */
export function formatTransactionSubline(input: {
  createdAt?: string | null;
  note?: string | null;
  label?: string | null;
  accountName?: string | null;
}): string {
  const time = formatOperationTime(input.createdAt);
  const text = input.note?.trim() || input.label?.trim() || '';
  const parts = [time, text].filter((part): part is string => !!part && part.length > 0);
  if (parts.length > 0) return parts.join(' · ');
  return input.accountName?.trim() ?? '';
}
