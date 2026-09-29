/** Formatage montants XOF entiers. */
export function formatXof(amount: number): string {
  const sign = amount < 0 ? '-' : '';
  const abs = Math.abs(amount);
  const withSpaces = abs
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${sign}${withSpaces} F CFA`;
}
