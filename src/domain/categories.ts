import { Category, Operation, OperationType } from './types';

export function canDeleteCategory(
  categoryId: string,
  operations: Operation[],
): boolean {
  return !operations.some((op) => op.categoryId === categoryId);
}

export function resolveCategoryRemoval(
  category: Category,
  operations: Operation[],
): { action: 'delete' } | { action: 'deactivate'; category: Category } {
  if (canDeleteCategory(category.id, operations)) {
    return { action: 'delete' };
  }
  return { action: 'deactivate', category: { ...category, active: false } };
}

export function assertCategoryAcceptsEntry(
  category: Category,
  operationType: OperationType,
): void {
  if (!category.active) {
    throw new Error('Catégorie désactivée : hors saisie');
  }
  if (category.type !== operationType) {
    throw new Error('La catégorie doit être du même type que l’opération');
  }
}

export function renameCategory(category: Category, name: string): Category {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Le nom de la catégorie est obligatoire');
  return { ...category, name: trimmed };
}

export function createCategory(
  id: string,
  name: string,
  type: OperationType,
  color: string,
  icon: string,
): Category {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Le nom de la catégorie est obligatoire');
  return { id, name: trimmed, type, color, icon, active: true };
}
