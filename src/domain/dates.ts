/** Utilitaires mois / dates (purs). */

export function toMonthKey(dateStr: string): string {
  return dateStr.slice(0, 7); // YYYY-MM-DD -> YYYY-MM
}

export function currentMonthKey(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function shiftMonth(monthKey: string, delta: number): string {
  const [ys, ms] = monthKey.split('-');
  const d = new Date(Number(ys), Number(ms) - 1 + delta, 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function formatMonthLabel(monthKey: string): string {
  const [ys, ms] = monthKey.split('-');
  const names = [
    'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
    'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
  ];
  const idx = Number(ms) - 1;
  return `${names[idx]} ${ys}`;
}

export function isInMonth(dateStr: string, monthKey: string): boolean {
  return toMonthKey(dateStr) === monthKey;
}

export function todayISO(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Affichage français JJ/MM/AAAA à partir d'une date ISO jour (YYYY-MM-DD). */
export function formatDateFr(isoDate: string): string {
  const [y, m, d] = isoDate.split('-');
  if (!y || !m || !d) return isoDate;
  return `${d}/${m}/${y}`;
}

/** Parse YYYY-MM-DD en Date locale (midi évite les décalages DST). */
export function parseISODateLocal(isoDate: string): Date {
  const [ys, ms, ds] = isoDate.split('-').map(Number);
  return new Date(ys, ms - 1, ds, 12, 0, 0, 0);
}

/** Date locale -> YYYY-MM-DD (stockage cohérent). */
export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
