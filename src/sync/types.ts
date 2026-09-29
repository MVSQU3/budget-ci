import { Account, Category, Operation } from '../domain/types';

export type RowClock = {
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  dirty: boolean;
};

export type SyncAccountRecord = Account & RowClock;

export type SyncCategoryRecord = Category & RowClock;

export type SyncOperationRecord = Operation &
  RowClock & {
    note: string | null;
  };

export type ApiAccount = {
  id: string;
  name: string;
  currency: string;
  openingBalanceCents: number;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type ApiCategory = {
  id: string;
  name: string;
  kind: string;
  color: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type ApiOperation = {
  id: string;
  accountId: string;
  categoryId: string;
  amountCents: number;
  occurredOn: string;
  label: string;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type SyncCursor = { updatedAt: string; id: string } | null;

export type SyncCursors = {
  accounts: SyncCursor;
  categories: SyncCursor;
  operations: SyncCursor;
};

export type PullResponse = {
  serverTime: string;
  accounts: ApiAccount[];
  categories: ApiCategory[];
  operations: ApiOperation[];
  cursors: SyncCursors;
  hasMore: {
    accounts: boolean;
    categories: boolean;
    operations: boolean;
  };
};

export type PushResponse = {
  serverTime: string;
  applied: {
    accounts: string[];
    categories: string[];
    operations: string[];
  };
  kept: {
    accounts: string[];
    categories: string[];
    operations: string[];
  };
};

export type RegisterResponse = {
  vaultId: string;
  serverTime: string;
};

export type SyncScreenState = {
  enabled: boolean;
  vaultId: string | null;
  code: string | null;
  lastSyncAt: string | null;
  lastError: string | null;
  counts: {
    operations: number;
    accounts: number;
    categories: number;
  };
  pending: number;
};
