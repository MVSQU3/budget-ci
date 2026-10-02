import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useBudget } from '../context/BudgetContext';
import { getMonthView } from '../services/BudgetService';
import { shiftMonth } from '../domain/dates';
import { isCeilingExceeded, recentOperations, sumBalances } from '../domain/accueil';
import { AmountText } from '../components/AmountText';
import { MonthSwitcher } from '../components/MonthSwitcher';
import { OperationRow } from '../components/OperationRow';
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

  const catById = Object.fromEntries(snapshot.categories.map((c) => [c.id, c]));
  const accById = Object.fromEntries(snapshot.accounts.map((a) => [a.id, a]));
  const recent = recentOperations(view.operations);
  const soldeTotal = sumBalances(snapshot.balances);
  const shift = (delta: number) => setMonthKey(shiftMonth(monthKey, delta));

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.greeting}>Bonjour</Text>
          <Text style={styles.title}>Accueil</Text>
          <View style={styles.headerLinks}>
            <Pressable
              onPress={() => navigation.navigate('Categories')}
              hitSlop={8}
            >
              <Text style={styles.headerLink}>Catégories</Text>
            </Pressable>
            <Pressable
              onPress={() => navigation.navigate('Plafonds')}
              hitSlop={8}
            >
              <Text style={styles.headerLink}>Plafonds</Text>
            </Pressable>
            <Pressable
              onPress={() => navigation.navigate('Synchronisation')}
              hitSlop={8}
            >
              <Text style={styles.headerLink}>Synchronisation</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.hero}>
          <Text style={styles.cardLabel}>Solde total</Text>
          <AmountText
            value={soldeTotal}
            tone={soldeTotal < 0 ? 'danger' : 'neutral'}
          />
        </View>

        <View style={styles.pills}>
          <Pressable
            style={styles.pill}
            onPress={() => navigation.navigate('OperationForm', { type: 'depense' })}
          >
            <Text style={styles.pillText}>Dépense</Text>
          </Pressable>
          <Pressable
            style={styles.pill}
            onPress={() => navigation.navigate('OperationForm', { type: 'revenu' })}
          >
            <Text style={styles.pillText}>Revenu</Text>
          </Pressable>
          <Pressable
            style={styles.pill}
            onPress={() => navigation.navigate('Comptes')}
          >
            <Text style={styles.pillText}>Budgets</Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Ce mois</Text>
          <MonthSwitcher
            monthKey={monthKey}
            onPrevious={() => shift(-1)}
            onNext={() => shift(1)}
          />
          <View style={styles.cards}>
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Revenus</Text>
              <AmountText value={view.totals.totalIncome} tone="income" />
            </View>
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Dépenses</Text>
              <AmountText value={view.totals.totalExpense} tone="expense" />
            </View>
          </View>
        </View>

        <View style={styles.recentHeader}>
          <Text style={styles.sectionLabel}>Récent</Text>
          <Pressable
            onPress={() => navigation.navigate('Operations')}
            hitSlop={8}
          >
            <Text style={styles.headerLink}>Tout voir</Text>
          </Pressable>
        </View>
        {recent.length === 0 ? (
          <Text style={styles.empty}>Aucune opération ce mois-ci.</Text>
        ) : (
          recent.map((item) => (
            <OperationRow
              key={item.id}
              operation={item}
              category={catById[item.categoryId]}
              accountName={accById[item.accountId]?.name}
              exceeded={isCeilingExceeded(item, view.ceilingStatuses)}
              onPress={() =>
                navigation.navigate('OperationForm', { operationId: item.id })
              }
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { padding: 20, paddingBottom: 24 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  error: { color: '#c0392b', padding: 16 },
  header: { marginBottom: 24 },
  greeting: { fontSize: 12, color: colors.muted, marginBottom: 4 },
  title: { fontSize: 20, fontWeight: '700', color: colors.text },
  headerLinks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
  },
  headerLink: { fontSize: 12, fontWeight: '700', color: colors.accent },
  hero: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  pills: { flexDirection: 'row', gap: 12 },
  pill: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.chip,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },
  pillText: { color: colors.text, fontWeight: '700' },
  section: { marginTop: 24, gap: 12 },
  sectionLabel: { fontWeight: '700', color: colors.text },
  cards: { flexDirection: 'row', gap: 12 },
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 12,
  },
  cardLabel: { fontSize: 12, color: colors.muted, marginBottom: 4 },
  recentHeader: {
    marginTop: 24,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  empty: { color: colors.muted, fontStyle: 'italic', padding: 12 },
});
