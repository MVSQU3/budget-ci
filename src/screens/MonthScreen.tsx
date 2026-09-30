import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useBudget } from '../context/BudgetContext';
import { getMonthView } from '../services/BudgetService';
import { formatMonthLabel, shiftMonth } from '../domain/dates';
import { AmountText } from '../components/AmountText';
import { CategoryBadge } from '../components/CategoryBadge';
import { formatDateFr } from '../domain/dates';
import { RootStackParamList } from '../navigation/types';
import { colors } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Mois'>;

export function MonthScreen({ navigation }: Props) {
  const { snapshot, monthKey, setMonthKey, ready, error } = useBudget();

  const view = useMemo(() => {
    if (!snapshot) return null;
    return getMonthView(snapshot, monthKey);
  }, [snapshot, monthKey]);

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }
  if (!ready || !snapshot || !view) {
    return (
      <View style={styles.center}>
        <Text>Chargement…</Text>
      </View>
    );
  }

  const catById = Object.fromEntries(
    snapshot.categories.map((c) => [c.id, c]),
  );
  const accById = Object.fromEntries(snapshot.accounts.map((a) => [a.id, a]));

  return (
    <View style={styles.container}>
      <View style={styles.monthNav}>
        <TouchableOpacity
          onPress={() => setMonthKey(shiftMonth(monthKey, -1))}
          style={styles.navBtn}
        >
          <Text style={styles.navBtnText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.monthTitle}>{formatMonthLabel(monthKey)}</Text>
        <TouchableOpacity
          onPress={() => setMonthKey(shiftMonth(monthKey, 1))}
          style={styles.navBtn}
        >
          <Text style={styles.navBtnText}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.summary}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Revenus</Text>
          <AmountText value={view.totals.totalIncome} tone="income" />
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Dépenses</Text>
          <AmountText value={view.totals.totalExpense} tone="expense" />
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Solde du mois</Text>
          <AmountText
            value={view.totals.balance}
            tone={view.totals.balance < 0 ? 'danger' : 'neutral'}
          />
        </View>
      </View>

      <Text style={styles.sectionTitle}>Soldes des comptes</Text>
      <View style={styles.accountsBox}>
        {snapshot.accounts.map((a) => {
          const bal = snapshot.balances[a.id] ?? 0;
          return (
            <View key={a.id} style={styles.accountRow}>
              <Text style={styles.accountName}>
                {a.name}
                {a.archived ? ' (archivé)' : ''}
                {bal < 0 ? ' ⚠' : ''}
              </Text>
              <AmountText
                value={bal}
                tone={bal < 0 ? 'danger' : 'neutral'}
              />
            </View>
          );
        })}
      </View>

      <View style={styles.actions}>
        <Pressable
          style={styles.primaryBtn}
          onPress={() => navigation.navigate('OperationForm', {})}
        >
          <Text style={styles.primaryBtnText}>+ Opération</Text>
        </Pressable>
        <Pressable
          style={styles.secondaryBtn}
          onPress={() => navigation.navigate('Comptes')}
        >
          <Text>Comptes</Text>
        </Pressable>
        <Pressable
          style={styles.secondaryBtn}
          onPress={() => navigation.navigate('Categories')}
        >
          <Text>Catégories</Text>
        </Pressable>
        <Pressable
          style={styles.secondaryBtn}
          onPress={() => navigation.navigate('Plafonds')}
        >
          <Text>Plafonds</Text>
        </Pressable>
        <Pressable
          style={styles.secondaryBtn}
          onPress={() => navigation.navigate('Synchronisation')}
        >
          <Text>Synchronisation</Text>
        </Pressable>
      </View>

      <Text style={styles.sectionTitle}>Opérations du mois</Text>
      <FlatList
        data={view.operations}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <Text style={styles.empty}>Aucune opération ce mois-ci.</Text>
        }
        renderItem={({ item }) => {
          const cat = catById[item.categoryId];
          const acc = accById[item.accountId];
          const ceilingStatus = view.ceilingStatuses.find(
            (c) => c.categoryId === item.categoryId,
          );
          const exceeded =
            item.type === 'depense' && ceilingStatus?.exceeded;
          return (
            <TouchableOpacity
              style={styles.opRow}
              onPress={() =>
                navigation.navigate('OperationForm', { operationId: item.id })
              }
            >
              {cat ? (
                <CategoryBadge color={cat.color} icon={cat.icon} />
              ) : null}
              <View style={{ flex: 1 }}>
                <Text style={styles.opLabel}>
                  {item.label}
                  {exceeded ? ' ⚠ plafond' : ''}
                </Text>
                <Text style={styles.opMeta}>
                  {formatDateFr(item.date)} · {cat?.name ?? '?'} · {acc?.name ?? '?'}
                  {cat && !cat.active ? ' (cat. désactivée)' : ''}
                </Text>
              </View>
              <AmountText
                value={item.type === 'revenu' ? item.amount : -item.amount}
                tone={item.type === 'revenu' ? 'income' : 'expense'}
              />
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  error: { color: '#c0392b', padding: 16 },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  navBtn: { padding: 10 },
  navBtnText: { fontSize: 28, color: colors.accent },
  monthTitle: {
    fontSize: 20,
    fontWeight: '700',
    textTransform: 'capitalize',
    color: colors.text,
  },
  summary: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    gap: 6,
  },
  summaryItem: { flex: 1 },
  summaryLabel: { fontSize: 12, color: colors.muted, marginBottom: 4 },
  sectionTitle: {
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 6,
    color: colors.text,
  },
  accountsBox: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 8,
  },
  accountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  accountName: { color: colors.text },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 10,
  },
  primaryBtn: {
    backgroundColor: colors.accent,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  primaryBtnText: { color: colors.onAccent, fontWeight: '700' },
  secondaryBtn: {
    backgroundColor: colors.chip,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },
  opRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: 8,
    marginBottom: 6,
    alignItems: 'center',
  },
  opLabel: { fontWeight: '600', color: colors.text },
  opMeta: { fontSize: 12, color: colors.muted, marginTop: 2 },
  empty: { color: colors.muted, fontStyle: 'italic', padding: 12 },
});
