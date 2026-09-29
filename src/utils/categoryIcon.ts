/** Affiche l'icône catégorie (emoji seed ou mapping legacy). */

const LEGACY_ICON_EMOJI: Record<string, string> = {
  cash: '💰',
  'add-circle': '➕',
  home: '🏠',
  cart: '🛒',
  bus: '🚌',
  'phone-portrait': '📱',
  medkit: '🏥',
  'game-controller': '🎮',
  card: '💳',
  'ellipsis-horizontal': '⋯',
  pricetag: '🏷️',
};

/** Normalise une valeur icon (emoji déjà stocké ou ancien nom ionicon). */
export function displayCategoryIcon(icon: string | null | undefined): string {
  if (!icon) return '🏷️';
  if (LEGACY_ICON_EMOJI[icon]) return LEGACY_ICON_EMOJI[icon];
  return icon;
}
