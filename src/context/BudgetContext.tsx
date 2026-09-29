import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Alert } from 'react-native';
import {
  AppSnapshot,
  MutationAlerts,
  initApp,
  loadSnapshot,
} from '../services/BudgetService';
import { currentMonthKey } from '../domain/dates';

type BudgetContextValue = {
  ready: boolean;
  error: string | null;
  snapshot: AppSnapshot | null;
  monthKey: string;
  setMonthKey: (k: string) => void;
  refresh: () => Promise<void>;
  applySnapshot: (snap: AppSnapshot) => void;
  showMutationAlerts: (alerts: MutationAlerts) => void;
};

const BudgetContext = createContext<BudgetContextValue | null>(null);

export function BudgetProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<AppSnapshot | null>(null);
  const [monthKey, setMonthKey] = useState(currentMonthKey());

  const refresh = useCallback(async () => {
    const snap = await loadSnapshot();
    setSnapshot(snap);
  }, []);

  const applySnapshot = useCallback((snap: AppSnapshot) => {
    setSnapshot(snap);
    void (async () => {
      try {
        const { syncIfEnabled } = await import('../sync/engine');
        await syncIfEnabled();
        setSnapshot(await loadSnapshot());
      } catch {
        // L'écriture locale est déjà enregistrée.
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const snap = await initApp();
        setSnapshot(snap);
        setReady(true);
        try {
          const { syncIfEnabled } = await import('../sync/engine');
          await syncIfEnabled();
          setSnapshot(await loadSnapshot());
        } catch {
          // Hors-ligne ou synchro coupée : l'écran local reste affiché.
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    })();
  }, []);

  const showMutationAlerts = useCallback((alerts: MutationAlerts) => {
    const messages: string[] = [];
    for (const n of alerts.negative) {
      messages.push(
        `Le compte « ${n.accountName} » est passé en solde négatif (${n.balance} F CFA).`,
      );
    }
    for (const c of alerts.ceilings) {
      messages.push(
        `Plafond dépassé pour « ${c.categoryName} » : ${c.spent} / ${c.ceiling} F CFA.`,
      );
    }
    if (messages.length === 0) return;
    Alert.alert('Attention', messages.join('\n\n'));
  }, []);

  const value = useMemo(
    () => ({
      ready,
      error,
      snapshot,
      monthKey,
      setMonthKey,
      refresh,
      applySnapshot,
      showMutationAlerts,
    }),
    [ready, error, snapshot, monthKey, refresh, applySnapshot, showMutationAlerts],
  );

  return (
    <BudgetContext.Provider value={value}>{children}</BudgetContext.Provider>
  );
}

export function useBudget(): BudgetContextValue {
  const ctx = useContext(BudgetContext);
  if (!ctx) throw new Error('useBudget hors BudgetProvider');
  return ctx;
}
