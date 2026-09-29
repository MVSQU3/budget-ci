import { OperationType } from '../domain/types';
import {
  ApiAccount,
  ApiCategory,
  ApiOperation,
  SyncAccountRecord,
  SyncCategoryRecord,
  SyncOperationRecord,
} from './types';

/**
 * L'API nomme les montants *Cents. L'app stocke déjà des entiers XOF :
 * le même entier est recopié, sans conversion.
 */
export const APP_CURRENCY = 'XOF';

const DAY = /^\d{4}-\d{2}-\d{2}$/;

export function typeToKind(type: OperationType): 'income' | 'expense' {
  return type === 'revenu' ? 'income' : 'expense';
}

export function kindToType(kind: string): OperationType | null {
  if (kind === 'income') return 'revenu';
  if (kind === 'expense') return 'depense';
  return null;
}

export function mapAccountToApi(row: SyncAccountRecord): ApiAccount {
  return {
    id: row.id,
    name: row.name,
    currency: APP_CURRENCY,
    openingBalanceCents: row.openingBalance,
    archived: row.archived,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
  };
}

export function mapAccountFromApi(row: ApiAccount): SyncAccountRecord | null {
  if (!row.id || !row.name?.trim()) return null;
  if (!Number.isInteger(row.openingBalanceCents)) return null;
  if (typeof row.archived !== 'boolean') return null;
  if (!row.createdAt || !row.updatedAt) return null;
  return {
    id: row.id,
    name: row.name,
    openingBalance: row.openingBalanceCents,
    archived: row.archived,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt ?? null,
    dirty: false,
  };
}

export function mapCategoryToApi(row: SyncCategoryRecord): ApiCategory {
  return {
    id: row.id,
    name: row.name,
    kind: typeToKind(row.type),
    color: row.color,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
  };
}

export function mapCategoryFromApi(
  row: ApiCategory,
  local: SyncCategoryRecord | undefined,
): SyncCategoryRecord | null {
  const type = kindToType(row.kind);
  if (!type || !row.id || !row.name?.trim() || !row.color) return null;
  if (!row.createdAt || !row.updatedAt) return null;
  return {
    id: row.id,
    name: row.name,
    type,
    color: row.color,
    icon: local?.icon ?? '🏷️',
    active: local?.active ?? true,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt ?? null,
    dirty: false,
  };
}

export function mapOperationToApi(row: SyncOperationRecord): ApiOperation {
  return {
    id: row.id,
    accountId: row.accountId,
    categoryId: row.categoryId,
    amountCents: row.amount,
    occurredOn: row.date,
    label: row.label,
    note: row.note ?? '',
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
  };
}

export function mapOperationFromApi(
  row: ApiOperation,
  categoryType: OperationType | null,
): SyncOperationRecord | null {
  if (!row.id || !row.accountId || !row.categoryId) return null;
  if (!row.createdAt || !row.updatedAt) return null;
  const deletedAt = row.deletedAt ?? null;
  if (!categoryType && !deletedAt) return null;
  const amount =
    Number.isInteger(row.amountCents) && row.amountCents > 0
      ? row.amountCents
      : null;
  if (!amount && !deletedAt) return null;
  const occurredOn = DAY.test(row.occurredOn) ? row.occurredOn : null;
  if (!occurredOn && !deletedAt) return null;
  const note = row.note ?? '';
  const label = row.label?.trim() || note.trim() || 'Sans libellé';
  return {
    id: row.id,
    type: categoryType ?? 'depense',
    amount: amount ?? 1,
    date: occurredOn ?? '1970-01-01',
    label,
    categoryId: row.categoryId,
    accountId: row.accountId,
    note,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt,
    dirty: false,
  };
}
