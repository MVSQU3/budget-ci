import { registerVault, pullChanges, pushChanges, SyncApiError } from '../client';
import { generateSyncCode, isSyncCode, isVaultId, normalizeSyncCode, parseSharedJoinText } from '../code';
import { DEFAULT_SYNC_API_BASE_URL, resolveSyncApiBaseUrl } from '../config';
import { runGuardedSync } from '../guard';
import { shouldApplyRemote } from '../lww';
import {
  APP_CURRENCY,
  kindToType,
  mapAccountFromApi,
  mapAccountToApi,
  mapCategoryFromApi,
  mapOperationFromApi,
  mapOperationToApi,
  typeToKind,
} from '../map';
import {
  categoryTypeMap,
  dirtyPushPayload,
  planCategoryWrites,
  planOperationWrites,
} from '../merge';
import {
  SyncAccountRecord,
  SyncCategoryRecord,
  SyncOperationRecord,
} from '../types';

const clock = {
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-02T00:00:00.000Z',
  deletedAt: null,
  dirty: true,
};

function account(partial: Partial<SyncAccountRecord> = {}): SyncAccountRecord {
  return {
    id: 'acc_especes',
    name: 'Espèces',
    openingBalance: 1500,
    archived: false,
    ...clock,
    ...partial,
  };
}

function category(partial: Partial<SyncCategoryRecord> = {}): SyncCategoryRecord {
  return {
    id: 'cat_courses',
    name: 'Courses',
    type: 'depense',
    color: '#e67e22',
    icon: '🛒',
    active: false,
    ...clock,
    ...partial,
  };
}

function operation(partial: Partial<SyncOperationRecord> = {}): SyncOperationRecord {
  return {
    id: 'op_1',
    type: 'depense',
    amount: 2500,
    date: '2026-09-03',
    label: 'Marché',
    categoryId: 'cat_courses',
    accountId: 'acc_especes',
    note: 'légumes',
    ...clock,
    ...partial,
  };
}

describe('code secret', () => {
  it('génère exactement 8 caractères alphanumériques', () => {
    const code = generateSyncCode(() => 0);
    expect(code).toHaveLength(8);
    expect(isSyncCode(code)).toBe(true);
    expect(code).toBe('AAAAAAAA');
  });

  it('refuse un code trop court et normalise la saisie', () => {
    expect(isSyncCode('ABC123')).toBe(false);
    expect(isSyncCode('ABC123456')).toBe(false);
    expect(normalizeSyncCode(' ab-12 cd34 ')).toBe('AB12CD34');
    expect(isVaultId('de2885d3-25ee-442b-bc9d-eb1883adeff5')).toBe(true);
    expect(isVaultId('pas-un-coffre')).toBe(false);
  });

  it('relit un message partagé', () => {
    const parsed = parseSharedJoinText(
      'Code budget-ci : AB12CD34\nIdentifiant du coffre : de2885d3-25ee-442b-bc9d-eb1883adeff5\nSans compte email.',
    );
    expect(parsed).toEqual({
      code: 'AB12CD34',
      vaultId: 'de2885d3-25ee-442b-bc9d-eb1883adeff5',
    });
  });
});

describe('config', () => {
  it('utilise l’URL publique par défaut et accepte un override', () => {
    expect(resolveSyncApiBaseUrl(undefined, undefined)).toBe(DEFAULT_SYNC_API_BASE_URL);
    expect(resolveSyncApiBaseUrl(' https://exemple.test/ ', undefined)).toBe(
      'https://exemple.test',
    );
    expect(resolveSyncApiBaseUrl('', 'https://extra.test/')).toBe('https://extra.test');
  });
});

describe('mapping API', () => {
  it('recopie les entiers XOF vers les champs cents sans conversion', () => {
    const api = mapAccountToApi(account());
    expect(api.currency).toBe(APP_CURRENCY);
    expect(api.openingBalanceCents).toBe(1500);
    expect(api).not.toHaveProperty('openingBalance');
    expect(mapAccountFromApi(api)?.openingBalance).toBe(1500);
  });

  it('traduit revenu/depense vers income/expense', () => {
    expect(typeToKind('revenu')).toBe('income');
    expect(typeToKind('depense')).toBe('expense');
    expect(kindToType('income')).toBe('revenu');
    expect(kindToType('expense')).toBe('depense');
    expect(kindToType('depense')).toBeNull();
  });

  it('mappe une opération vers amountCents et occurredOn', () => {
    const api = mapOperationToApi(operation());
    expect(api.amountCents).toBe(2500);
    expect(api.occurredOn).toBe('2026-09-03');
    expect(api.note).toBe('légumes');
    expect(api.label).toBe('Marché');
    const back = mapOperationFromApi(api, 'depense');
    expect(back?.amount).toBe(2500);
    expect(back?.date).toBe('2026-09-03');
    expect(back?.type).toBe('depense');
  });

  it('conserve l’icône et l’état actif absents de l’API', () => {
    const remote = {
      id: 'cat_courses',
      name: 'Courses renommées',
      kind: 'expense',
      color: '#111111',
      createdAt: clock.createdAt,
      updatedAt: '2026-09-05T00:00:00.000Z',
      deletedAt: null,
    };
    const local = category();
    const writes = planCategoryWrites([local], [remote]);
    expect(writes).toHaveLength(1);
    expect(writes[0]?.name).toBe('Courses renommées');
    expect(writes[0]?.icon).toBe('🛒');
    expect(writes[0]?.active).toBe(false);
    expect(writes[0]?.type).toBe('depense');
  });

  it('n’envoie que les lignes dirty', () => {
    const payload = dirtyPushPayload({
      accounts: [account({ dirty: false }), account({ id: 'acc_new', dirty: true })],
      categories: [category({ dirty: false })],
      operations: [operation({ dirty: true, amount: 80 })],
    });
    expect(payload.accounts.map((row) => row.id)).toEqual(['acc_new']);
    expect(payload.categories).toHaveLength(0);
    expect(payload.operations[0]?.amountCents).toBe(80);
  });

  it('déduit le type d’opération depuis la catégorie', () => {
    const income = category({ id: 'cat_salaire', type: 'revenu', name: 'Salaire' });
    const types = categoryTypeMap([], [income]);
    const writes = planOperationWrites(
      [],
      [
        {
          id: 'op_salaire',
          accountId: 'acc_especes',
          categoryId: 'cat_salaire',
          amountCents: 100000,
          occurredOn: '2026-09-01',
          label: 'Paie',
          note: '',
          createdAt: clock.createdAt,
          updatedAt: clock.updatedAt,
          deletedAt: null,
        },
        {
          id: 'op_orpheline',
          accountId: 'acc_inconnu',
          categoryId: 'cat_salaire',
          amountCents: 10,
          occurredOn: '2026-09-01',
          label: 'Orpheline',
          note: '',
          createdAt: clock.createdAt,
          updatedAt: clock.updatedAt,
          deletedAt: null,
        },
      ],
      types,
      new Set(['acc_especes']),
    );
    expect(writes).toHaveLength(1);
    expect(writes[0]?.type).toBe('revenu');
    expect(writes[0]?.amount).toBe(100000);
  });
});

describe('last-write-wins', () => {
  it('prend la copie distante si elle est plus récente ou égale', () => {
    const local = { updatedAt: '2026-09-02T00:00:00.000Z' };
    expect(shouldApplyRemote(undefined, local.updatedAt)).toBe(true);
    expect(shouldApplyRemote(local, '2026-09-03T00:00:00.000Z')).toBe(true);
    expect(shouldApplyRemote(local, '2026-09-02T00:00:00.000Z')).toBe(true);
    expect(shouldApplyRemote(local, '2026-09-01T00:00:00.000Z')).toBe(false);
  });

  it('ignore une ligne distante plus ancienne', () => {
    const local = category({ updatedAt: '2026-09-08T00:00:00.000Z', name: 'Local' });
    const writes = planCategoryWrites(
      [local],
      [
        {
          id: local.id,
          name: 'Ancien',
          kind: 'expense',
          color: '#000000',
          createdAt: clock.createdAt,
          updatedAt: '2026-09-01T00:00:00.000Z',
          deletedAt: null,
        },
      ],
    );
    expect(writes).toHaveLength(0);
  });
});

describe('garde hors-ligne', () => {
  it('n’appelle ni le réseau ni la synchro quand elle est désactivée', async () => {
    const online = jest.fn(async () => {
      throw new Error('réseau');
    });
    const sync = jest.fn(async () => {
      throw new Error('sync');
    });
    await expect(runGuardedSync({ enabled: false, online, sync })).resolves.toBe('skipped');
    expect(online).not.toHaveBeenCalled();
    expect(sync).not.toHaveBeenCalled();
  });

  it('ne synchronise pas sans connexion', async () => {
    const sync = jest.fn();
    await expect(
      runGuardedSync({
        enabled: true,
        online: async () => false,
        sync,
      }),
    ).resolves.toBe('skipped');
    expect(sync).not.toHaveBeenCalled();
  });
});

describe('client HTTP', () => {
  const base = 'https://budget-ci-sync.vercel.app';

  function jsonResponse(status: number, body: unknown) {
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    };
  }

  it('inscrit un coffre sans autre champ que le secret', async () => {
    const fetchImpl = jest.fn(async () =>
      jsonResponse(201, { vaultId: 'vault-1', serverTime: '2026-09-29T00:00:00.000Z' }),
    );
    const created = await registerVault(base, 'AB12CD34', fetchImpl);
    expect(created.vaultId).toBe('vault-1');
    expect(fetchImpl).toHaveBeenCalledWith(
      `${base}/api/sync/register`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ secret: 'AB12CD34' }),
      }),
    );
  });

  it('lit et envoie les collections prévues', async () => {
    const fetchImpl = jest.fn(async (_url: string, _init: { body: string }) => {
      if (_url.endsWith('/pull')) {
        return jsonResponse(200, {
          serverTime: '2026-09-29T00:00:00.000Z',
          accounts: [],
          categories: [],
          operations: [],
          cursors: { accounts: null, categories: null, operations: null },
          hasMore: { accounts: false, categories: false, operations: false },
        });
      }
      return jsonResponse(200, {
        serverTime: '2026-09-29T00:00:00.000Z',
        applied: { accounts: ['acc_1'], categories: [], operations: [] },
        kept: { accounts: [], categories: [], operations: [] },
      });
    });
    await pullChanges(
      { baseUrl: base, vaultId: 'vault-1', secret: 'AB12CD34' },
      fetchImpl,
    );
    await pushChanges(
      {
        baseUrl: base,
        vaultId: 'vault-1',
        secret: 'AB12CD34',
        accounts: [mapAccountToApi(account({ id: 'acc_1', dirty: true }))],
      },
      fetchImpl,
    );
    const pullInit = fetchImpl.mock.calls[0]?.[1];
    const pushInit = fetchImpl.mock.calls[1]?.[1];
    const pullBody = JSON.parse(pullInit?.body ?? '{}');
    expect(pullBody).toMatchObject({ vaultId: 'vault-1', secret: 'AB12CD34', limit: 100 });
    const pushBody = JSON.parse(pushInit?.body ?? '{}');
    expect(pushBody.accounts[0].openingBalanceCents).toBe(1500);
    expect(pushBody.accounts[0].currency).toBe('XOF');
  });

  it('remonte le message d’erreur sans inventer de secret', async () => {
    const fetchImpl = jest.fn(async () => jsonResponse(401, { error: 'Secret incorrect.' }));
    await expect(registerVault(base, 'AB12CD34', fetchImpl)).rejects.toBeInstanceOf(
      SyncApiError,
    );
    await expect(registerVault(base, 'AB12CD34', fetchImpl)).rejects.toThrow(
      'Secret incorrect.',
    );
  });
});
