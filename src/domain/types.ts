/** Types du domaine budget-ci (montants XOF entiers). */

export type OperationType = 'revenu' | 'depense';

export interface Account {
  id: string;
  name: string;
  openingBalance: number;
  archived: boolean;
}

export interface Category {
  id: string;
  name: string;
  type: OperationType;
  color: string;
  icon: string;
  active: boolean;
}

export interface Operation {
  id: string;
  type: OperationType;
  amount: number;
  date: string; // YYYY-MM-DD
  label: string;
  categoryId: string;
  accountId: string;
}

export interface MonthlyCeiling {
  id: string;
  monthKey: string; // YYYY-MM
  categoryId: string;
  amount: number;
}

export interface AlertState {
  /** Clés déjà alertées : `${monthKey}:${categoryId}` */
  ceilingAlertsShown: string[];
  /** Comptes déjà alertés pour solde négatif */
  negativeBalanceAlertsShown: string[];
}

export interface MonthTotals {
  totalIncome: number;
  totalExpense: number;
  balance: number;
}

export interface CeilingStatus {
  categoryId: string;
  ceiling: number | null;
  spent: number;
  exceeded: boolean;
  justCrossed: boolean;
}

export interface BalanceStatus {
  accountId: string;
  balance: number;
  isNegative: boolean;
  justCrossed: boolean;
}
