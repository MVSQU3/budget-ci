import {
  ApiAccount,
  ApiCategory,
  ApiOperation,
  PullResponse,
  PushResponse,
  RegisterResponse,
  SyncCursors,
} from './types';

const PAGE_LIMIT = 100;

export class SyncApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'SyncApiError';
    this.status = status;
  }
}

export type FetchLike = (
  url: string,
  init: {
    method: string;
    headers: Record<string, string>;
    body: string;
  },
) => Promise<{
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
}>;

type Auth = {
  baseUrl: string;
  vaultId: string;
  secret: string;
};

function endpoint(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/$/, '')}${path}`;
}

async function postJson(
  fetchImpl: FetchLike,
  url: string,
  body: unknown,
): Promise<unknown> {
  const response = await fetchImpl(url, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      payload &&
      typeof payload === 'object' &&
      'error' in payload &&
      typeof payload.error === 'string'
        ? payload.error
        : `Erreur ${response.status}`;
    throw new SyncApiError(message, response.status);
  }
  return payload;
}

export async function registerVault(
  baseUrl: string,
  secret: string,
  fetchImpl: FetchLike = fetch,
): Promise<RegisterResponse> {
  const payload = await postJson(fetchImpl, endpoint(baseUrl, '/api/sync/register'), {
    secret,
  });
  if (
    !payload ||
    typeof payload !== 'object' ||
    !('vaultId' in payload) ||
    typeof payload.vaultId !== 'string' ||
    !('serverTime' in payload) ||
    typeof payload.serverTime !== 'string'
  ) {
    throw new SyncApiError('Réponse d’inscription invalide', 0);
  }
  return { vaultId: payload.vaultId, serverTime: payload.serverTime };
}

export async function pullChanges(
  input: Auth & { cursors?: SyncCursors; limit?: number },
  fetchImpl: FetchLike = fetch,
): Promise<PullResponse> {
  const body: {
    vaultId: string;
    secret: string;
    cursors?: SyncCursors;
    limit?: number;
  } = {
    vaultId: input.vaultId,
    secret: input.secret,
    limit: input.limit ?? PAGE_LIMIT,
  };
  if (input.cursors) body.cursors = input.cursors;
  const payload = await postJson(
    fetchImpl,
    endpoint(input.baseUrl, '/api/sync/pull'),
    body,
  );
  return parsePull(payload);
}

export async function pushChanges(
  input: Auth & {
    accounts?: ApiAccount[];
    categories?: ApiCategory[];
    operations?: ApiOperation[];
  },
  fetchImpl: FetchLike = fetch,
): Promise<PushResponse> {
  const body: Record<string, unknown> = {
    vaultId: input.vaultId,
    secret: input.secret,
  };
  if (input.accounts && input.accounts.length > 0) body.accounts = input.accounts;
  if (input.categories && input.categories.length > 0) {
    body.categories = input.categories;
  }
  if (input.operations && input.operations.length > 0) {
    body.operations = input.operations;
  }
  const payload = await postJson(
    fetchImpl,
    endpoint(input.baseUrl, '/api/sync/push'),
    body,
  );
  return parsePush(payload);
}

export async function pullAll(
  auth: Auth,
  fetchImpl: FetchLike = fetch,
): Promise<Pick<PullResponse, 'serverTime' | 'accounts' | 'categories' | 'operations'>> {
  let cursors: SyncCursors = {
    accounts: null,
    categories: null,
    operations: null,
  };
  const accounts: PullResponse['accounts'] = [];
  const categories: PullResponse['categories'] = [];
  const operations: PullResponse['operations'] = [];
  let serverTime = '';
  let previous = '';

  for (let page = 0; page < 100; page += 1) {
    const response = await pullChanges(
      { ...auth, cursors, limit: PAGE_LIMIT },
      fetchImpl,
    );
    accounts.push(...response.accounts);
    categories.push(...response.categories);
    operations.push(...response.operations);
    serverTime = response.serverTime;
    const more =
      response.hasMore.accounts ||
      response.hasMore.categories ||
      response.hasMore.operations;
    const marker = JSON.stringify(response.cursors);
    if (!more || marker === previous) break;
    previous = marker;
    cursors = response.cursors;
  }

  return { serverTime, accounts, categories, operations };
}

function parsePull(payload: unknown): PullResponse {
  if (!payload || typeof payload !== 'object') {
    throw new SyncApiError('Réponse de lecture invalide', 0);
  }
  const row = payload as PullResponse;
  if (
    !Array.isArray(row.accounts) ||
    !Array.isArray(row.categories) ||
    !Array.isArray(row.operations) ||
    !row.cursors ||
    !row.hasMore ||
    typeof row.serverTime !== 'string'
  ) {
    throw new SyncApiError('Réponse de lecture invalide', 0);
  }
  return row;
}

function parsePush(payload: unknown): PushResponse {
  if (!payload || typeof payload !== 'object') {
    throw new SyncApiError('Réponse d’envoi invalide', 0);
  }
  const row = payload as PushResponse;
  if (
    !row.applied ||
    !row.kept ||
    !Array.isArray(row.applied.accounts) ||
    !Array.isArray(row.applied.categories) ||
    !Array.isArray(row.applied.operations) ||
    typeof row.serverTime !== 'string'
  ) {
    throw new SyncApiError('Réponse d’envoi invalide', 0);
  }
  return row;
}
