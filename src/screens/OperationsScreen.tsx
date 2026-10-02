import React, { useMemo } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useBudget } from '../context/BudgetContext';
import { getMonthView } from '../services/BudgetService';
import { shiftMonth } from '../domain/dates';
import { isCeilingExceeded, sortOperationsDesc } from '../domain/accueil';
import { MonthSwitcher } from '../components/MonthSwitcher';
import { OperationRow } from '../components/OperationRow';
import { RootStackParamList } from '../navigation/types';
import { colors } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Operations'>;

/** Liste complète des opérations du mois, retirée de l’Accueil. */
export function OperationsScreen({ navigation }: Props) {
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
  const operations = sortOperationsDesc(view.operations);

  return (
    <View style={styles.container}>
      <MonthSwitcher
        monthKey={monthKey}
        onPrevious={() => setMonthKey(shiftMonth(monthKey, -1))}
        onNext={() => setMonthKey(shiftMonth(monthKey, 1))}
      />
      <FlatList
        data={operations}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>Aucune opération ce mois-ci.</Text>
        }
        renderItem={({ item }) => (
          <OperationRow
            operation={item}
            category={catById[item.categoryId]}
            accountName={accById[item.accountId]?.name}
            exceeded={isCeilingExceeded(item, view.ceilingStatuses)}
            onPress={() =>
              navigation.navigate('OperationForm', { operationId: item.id })
            }
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  list: { paddingTop: 12, paddingBottom: 20 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  error: { color: '#c0392b', padding: 16 },
  empty: { color: colors.muted, fontStyle: 'italic', padding: 12 },
});
