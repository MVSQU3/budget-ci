import { Account, Category, Operation, OperationType } from './types';
import { assertAccountAcceptsEntry } from './accounts';
import { assertCategoryAcceptsEntry } from './categories';

export function validateOperationInput(input: {
  type: OperationType;
  amount: number;
  date: string;
  label: string;
  categoryId: string;
  accountId: string;
}): void {
  if (input.type !== 'revenu' && input.type !== 'depense') {
    throw new Error('Type d’opération invalide');
  }
  if (!Number.isInteger(input.amount) || input.amount <= 0) {
    throw new Error('Le montant doit être un entier strictement positif');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
    throw new Error('Date invalide (attendu YYYY-MM-DD)');
  }
  if (!input.label.trim()) {
    throw new Error('Le libellé est obligatoire');
  }
  if (!input.categoryId) throw new Error('Catégorie obligatoire');
  if (!input.accountId) throw new Error('Compte obligatoire');
}

export function buildOperation(
  id: string,
  input: {
    type: OperationType;
    amount: number;
    date: string;
    label: string;
    categoryId: string;
    accountId: string;
  },
  account: Account,
  category: Category,
): Operation {
  validateOperationInput(input);
  assertAccountAcceptsEntry(account);
  assertCategoryAcceptsEntry(category, input.type);
  if (account.id !== input.accountId) {
    throw new Error('Compte incohérent');
  }
  if (category.id !== input.categoryId) {
    throw new Error('Catégorie incohérente');
  }
  return {
    id,
    type: input.type,
    amount: input.amount,
    date: input.date,
    label: input.label.trim(),
    categoryId: input.categoryId,
    accountId: input.accountId,
  };
}

/** Pour une modification : un compte ou une catégorie déjà utilisés peuvent rester
 * archivés/inactifs ; seuls les nouveaux choix doivent respecter les gardes de création.
 */
export function buildUpdatedOperation(
  existing: Operation,
  input: {
    type: OperationType;
    amount: number;
    date: string;
    label: string;
    categoryId: string;
    accountId: string;
  },
  account: Account,
  category: Category,
): { previous: Operation; next: Operation } {
  validateOperationInput(input);
  if (account.id !== input.accountId) {
    throw new Error('Compte incohérent');
  }
  if (category.id !== input.categoryId) {
    throw new Error('Catégorie incohérente');
  }

  // Un compte archivé est autorisé uniquement s'il est celui déjà associé.
  if (input.accountId !== existing.accountId) {
    assertAccountAcceptsEntry(account);
  }

  // Une catégorie inactive est autorisée uniquement si elle est déjà associée.
  // Le type reste toujours obligatoire, y compris pour cette catégorie conservée.
  if (input.categoryId !== existing.categoryId) {
    assertCategoryAcceptsEntry(category, input.type);
  } else if (category.type !== input.type) {
    throw new Error('La catégorie doit être du même type que l’opération');
  }

  const next: Operation = {
    id: existing.id,
    type: input.type,
    amount: input.amount,
    date: input.date,
    label: input.label.trim(),
    categoryId: input.categoryId,
    accountId: input.accountId,
  };
  return { previous: existing, next };
}