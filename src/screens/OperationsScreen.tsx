import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, SectionList, Pressable, ScrollView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useBudget } from '../context/BudgetContext';
import { getMonthView } from '../services/BudgetService';
import { toMonthKey } from '../domain/dates';
import { isCeilingExceeded } from '../domain/accueil';
import {
  filterOperationsByPeriod,
  formatTransactionSubline,
  groupOperationsByDay,
  TransactionPeriod,
} from '../domain/transactions';
import { OperationRow } from '../components/OperationRow';
import { Operation } from '../domain/types';
import { RootStackParamList } from '../navigation/types';
import { colors } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Operations'>;

const FILTERS: { id: TransactionPeriod; label: string }[] = [
  { id: 'all', label: 'Tout' },
  { id: 'today', label: 'Aujourd’hui' },
  { id: 'days7', label: '7 jours' },
  { id: 'month', label: 'Ce mois' },
];

/** Liste des transactions, groupée par jour selon la pastille active. */
export function OperationsScreen({ navigation }: Props) {
  const { snapshot, ready, error } = useBudget();
  const [period, setPeriod] = useState<TransactionPeriod>('month');

  const filtered = useMemo(() => {
    if (!snapshot) return [];
    return filterOperationsByPeriod(snapshot.operations, period);
  }, [snapshot, period]);

  const sections = useMemo(
    () =>
      groupOperationsByDay(filtered).map((group) => ({
        date: group.date,
        label: group.label,
        data: group.items,
      })),
    [filtered],
  );

  const ceilingByMonth = useMemo(() => {
    const map = new Map<string, ReturnType<typeof getMonthView>['ceilingStatuses']>();
    if (!snapshot) return map;
    for (const operation of filtered) {
      const month = toMonthKey(operation.date);
      if (map.has(month)) continue;
      map.set(month, getMonthView(snapshot, month).ceilingStatuses);
    }
    return map;
  }, [snapshot, filtered]);

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }
  if (!ready || !snapshot) {
    return (
      <View style={styles.center}>
        <Text>Chargement…</Text>
      </View>
    );
  }

  const catById = Object.fromEntries(snapshot.categories.map((c) => [c.id, c]));
  const accById = Object.fromEntries(snapshot.accounts.map((a) => [a.id, a]));

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipRow}
        contentContainerStyle={styles.chips}
      >
        {FILTERS.map((filter) => {
          const selected = period === filter.id;
          return (
            <Pressable
              key={filter.id}
              onPress={() => setPeriod(filter.id)}
              style={[styles.chip, selected && styles.chipSelected]}
              accessibilityRole="button"
              accessibilityState={{ selected }}
            >
              <Text style={selected ? styles.chipTextSelected : styles.chipText}>
                {filter.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        stickySectionHeadersEnabled={false}
        style={styles.sectionList}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>Aucune transaction sur cette période.</Text>
        }
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionLabel}>{section.label}</Text>
        )}
        renderItem={({ item, index, section }) => {
          const category = catById[item.categoryId];
          const inactive = category && !category.active ? ' (cat. désactivée)' : '';
          return (
            <OperationRow
              operation={item}
              category={category}
              accountName={accById[item.accountId]?.name}
              exceeded={isCeilingExceeded(
                item,
                ceilingByMonth.get(toMonthKey(item.date)) ?? [],
              )}
              heading={`${category?.name ?? 'Sans catégorie'}${inactive}`}
              detail={transactionDetail(item, accById[item.accountId]?.name)}
              style={{
                marginBottom: index === section.data.length - 1 ? 0 : 12,
              }}
              onPress={() =>
                navigation.navigate('OperationForm', { operationId: item.id })
              }
            />
          );
        }}
      />
    </View>
  );
}

function transactionDetail(operation: Operation, accountName?: string): string {
  return formatTransactionSubline({
    createdAt: operation.createdAt,
    note: operation.note,
    label: operation.label,
    accountName,
  });
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: 14,
    paddingTop: 12,
  },
  chipRow: { flexGrow: 0 },
  chips: { gap: 8 },
  chip: {
    backgroundColor: colors.chip,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  chipSelected: { backgroundColor: colors.accent },
  chipText: { color: colors.text },
  chipTextSelected: { color: colors.onAccent, fontWeight: '700' },
  sectionList: { flex: 1 },
  list: { paddingBottom: 14 },
  sectionLabel: {
    marginTop: 18,
    marginBottom: 9,
    fontWeight: '700',
    color: colors.text,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  error: { color: '#c0392b', padding: 16 },
  empty: { color: colors.muted, fontStyle: 'italic', marginTop: 18, padding: 12 },
});
