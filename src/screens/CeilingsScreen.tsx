import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  Alert,
} from 'react-native';
import { useBudget } from '../context/BudgetContext';
import { getMonthView, setCeiling } from '../services/BudgetService';
import { formatMonthLabel } from '../domain/dates';
import { formatXof } from '../utils/format';
import { CategoryBadge } from '../components/CategoryBadge';

export function CeilingsScreen() {
  const { snapshot, monthKey, applySnapshot } = useBudget();
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const view = useMemo(() => {
    if (!snapshot) return null;
    return getMonthView(snapshot, monthKey);
  }, [snapshot, monthKey]);

  if (!snapshot || !view) return null;

  const expenseCats = snapshot.categories.filter((c) => c.type === 'depense');

  const onSave = async (categoryId: string) => {
    const raw = drafts[categoryId];
    const amount = Number(raw);
    if (!Number.isInteger(amount) || amount < 0) {
      Alert.alert('Erreur', 'Le plafond doit être un entier >= 0.');
      return;
    }
    try {
      applySnapshot(await setCeiling(monthKey, categoryId, amount));
      Alert.alert('OK', 'Plafond enregistré.');
    } catch (e) {
      Alert.alert('Erreur', e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Plafonds — {formatMonthLabel(monthKey)}
      </Text>
      <Text style={styles.hint}>
        Définissez un plafond de dépense par catégorie pour ce mois. Un
        avertissement s’affiche une seule fois au franchissement.
      </Text>
      <FlatList
        data={expenseCats}
        keyExtractor={(c) => c.id}
        renderItem={({ item }) => {
          const status = view.ceilingStatuses.find(
            (s) => s.categoryId === item.id,
          );
          const current =
            drafts[item.id] ??
            (status?.ceiling !== null && status?.ceiling !== undefined
              ? String(status.ceiling)
              : '');
          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.nameRow}>
                  <CategoryBadge color={item.color} icon={item.icon} />
                  <Text style={styles.name}>
                    {item.name}
                    {!item.active ? ' (désactivée)' : ''}
                    {status?.exceeded ? ' ⚠ dépassé' : ''}
                  </Text>
                </View>
                <Text style={styles.spent}>
                  Dépensé : {formatXof(status?.spent ?? 0)}
                </Text>
              </View>
              <View style={styles.row}>
                <TextInput
                  style={styles.input}
                  keyboardType="number-pad"
                  placeholder="Plafond F CFA"
                  value={current}
                  onChangeText={(v) =>
                    setDrafts((d) => ({ ...d, [item.id]: v }))
                  }
                />
                <Pressable
                  style={styles.saveBtn}
                  onPress={() => onSave(item.id)}
                >
                  <Text style={styles.saveText}>OK</Text>
                </Pressable>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12, backgroundColor: '#f7f9fb' },
  title: { fontSize: 20, fontWeight: '700', textTransform: 'capitalize' },
  hint: { color: '#7f8c8d', marginVertical: 8, fontSize: 13 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  cardHeader: { marginBottom: 8 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { fontWeight: '700', color: '#2c3e50' },
  spent: { color: '#7f8c8d', fontSize: 12, marginTop: 2 },
  row: { flexDirection: 'row', gap: 8 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#dfe6e9',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  saveBtn: {
    backgroundColor: '#27ae60',
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderRadius: 8,
  },
  saveText: { color: '#fff', fontWeight: '700' },
});
