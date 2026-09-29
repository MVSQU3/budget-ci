import { Account, Operation } from './types';

export function canDeleteAccount(
  accountId: string,
  operations: Operation[],
): boolean {
  return !operations.some((op) => op.accountId === accountId);
}

/** Suppression si aucune opération, sinon archiver. */
export function resolveAccountRemoval(
  account: Account,
  operations: Operation[],
): { action: 'delete' } | { action: 'archive'; account: Account } {
  if (canDeleteAccount(account.id, operations)) {
    return { action: 'delete' };
  }
  return { action: 'archive', account: { ...account, archived: true } };
}

export function assertAccountAcceptsEntry(account: Account): void {
  if (account.archived) {
    throw new Error('Compte archivé : nouvelle saisie interdite');
  }
}

export function renameAccount(account: Account, name: string): Account {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Le nom du compte est obligatoire');
  return { ...account, name: trimmed };
}

export function createAccount(
  id: string,
  name: string,
  openingBalance: number = 0,
): Account {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Le nom du compte est obligatoire');
  if (!Number.isInteger(openingBalance)) {
    throw new Error('Le solde de départ doit être un entier');
  }
  return {
    id,
    name: trimmed,
    openingBalance,
    archived: false,
  };
}
