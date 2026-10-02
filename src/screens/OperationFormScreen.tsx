import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useBudget } from '../context/BudgetContext';
import {
  addOperation,
  updateOperation,
  removeOperation,
} from '../services/BudgetService';
import {
  todayISO,
  formatDateFr,
  parseISODateLocal,
  toISODate,
} from '../domain/dates';
import { OperationType } from '../domain/types';
import { RootStackParamList } from '../navigation/types';
import { CategoryBadge } from '../components/CategoryBadge';
import { colors } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'OperationForm'>;

export function OperationFormScreen({ navigation, route }: Props) {
  const { snapshot, applySnapshot, showMutationAlerts } = useBudget();
  const existing = snapshot?.operations.find(
    (o) => o.id === route.params?.operationId,
  );

  const [type, setType] = useState<OperationType>(
    existing?.type ?? route.params?.type ?? 'depense',
  );
  const [amount, setAmount] = useState(existing ? String(existing.amount) : '');
  const [date, setDate] = useState(existing?.date ?? todayISO());
  const [label, setLabel] = useState(existing?.label ?? '');
  const [categoryId, setCategoryId] = useState(existing?.categoryId ?? '');
  const [accountId, setAccountId] = useState(existing?.accountId ?? '');
  const [saving, setSaving] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const categories = useMemo(() => {
    if (!snapshot) return [];
    return snapshot.categories.filter(
      (c) => c.type === type && (c.active || c.id === existing?.categoryId),
    );
  }, [snapshot, type, existing]);

  const accounts = useMemo(() => {
    if (!snapshot) return [];
    return snapshot.accounts.filter(
      (a) => !a.archived || a.id === existing?.accountId,
    );
  }, [snapshot, existing]);

  React.useEffect(() => {
    if (!categoryId && categories.length) {
      const active = categories.find((c) => c.active);
      if (active) setCategoryId(active.id);
    }
  }, [categories, categoryId]);

  React.useEffect(() => {
    if (!accountId && accounts.length) {
      const open = accounts.find((a) => !a.archived);
      if (open) setAccountId(open.id);
    }
  }, [accounts, accountId]);

  const onDateChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (event.type === 'dismissed') return;
    if (selected) {
      setDate(toISODate(selected));
    }
  };

  const onSave = async () => {
    const parsed = Number(amount);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      Alert.alert('Erreur', 'Le montant doit être un entier strictement positif.');
      return;
    }
    const account = snapshot?.accounts.find((a) => a.id === accountId);
    if (account?.archived && accountId !== existing?.accountId) {
      Alert.alert('Erreur', 'Compte archivé : nouvelle saisie interdite.');
      return;
    }
    setSaving(true);
    try {
      const input = {
        type,
        amount: parsed,
        date,
        label,
        categoryId,
        accountId,
      };
      const result = existing
        ? await updateOperation(existing.id, input)
        : await addOperation(input);
      applySnapshot(result.snapshot);
      showMutationAlerts(result.alerts);
      navigation.goBack();
    } catch (e) {
      Alert.alert('Erreur', e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const onDelete = () => {
    if (!existing) return;
    Alert.alert('Supprimer', 'Supprimer cette opération ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          try {
            const result = await removeOperation(existing.id);
            applySnapshot(result.snapshot);
            showMutationAlerts(result.alerts);
            navigation.goBack();
          } catch (e) {
            Alert.alert('Erreur', e instanceof Error ? e.message : String(e));
          }
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.title}>
        {existing ? 'Modifier l’opération' : 'Nouvelle opération'}
      </Text>

      <Text style={styles.label}>Type</Text>
      <View style={styles.row}>
        {(['depense', 'revenu'] as OperationType[]).map((t) => (
          <Pressable
            key={t}
            style={[styles.chip, type === t && styles.chipActive]}
            onPress={() => {
              setType(t);
              setCategoryId('');
            }}
          >
            <Text style={type === t ? styles.chipTextActive : undefined}>
              {t === 'depense' ? 'Dépense' : 'Revenu'}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Montant (F CFA entier)</Text>
      <TextInput
        style={styles.input}
        keyboardType="number-pad"
        value={amount}
        onChangeText={setAmount}
        placeholder="ex. 5000"
        placeholderTextColor={colors.muted}
      />

      <Text style={styles.label}>Date</Text>
      <Pressable
        style={styles.input}
        onPress={() => setShowDatePicker(true)}
      >
        <Text style={styles.dateText}>{formatDateFr(date)}</Text>
      </Pressable>
      {showDatePicker ? (
        <DateTimePicker
          value={parseISODateLocal(date)}
          mode="date"
          display="default"
          onChange={onDateChange}
        />
      ) : null}

      <Text style={styles.label}>Libellé</Text>
      <TextInput
        style={styles.input}
        value={label}
        onChangeText={setLabel}
        placeholder="Description"
        placeholderTextColor={colors.muted}
      />

      <Text style={styles.label}>Catégorie</Text>
      <View style={styles.wrap}>
        {categories
          .filter((c) => c.active || c.id === categoryId)
          .map((c) => (
            <Pressable
              key={c.id}
              style={[
                styles.chip,
                styles.catChip,
                categoryId === c.id && styles.chipActive,
                !c.active && styles.chipDisabled,
              ]}
              onPress={() => c.active && setCategoryId(c.id)}
            >
              <CategoryBadge color={c.color} icon={c.icon} size={10} />
              <Text>
                {c.name}
                {!c.active ? ' (désactivée)' : ''}
              </Text>
            </Pressable>
          ))}
      </View>

      <Text style={styles.label}>Compte</Text>
      <View style={styles.wrap}>
        {accounts.map((a) => (
          <Pressable
            key={a.id}
            style={[
              styles.chip,
              accountId === a.id && styles.chipActive,
              a.archived && styles.chipDisabled,
            ]}
            onPress={() => !a.archived && setAccountId(a.id)}
          >
            <Text>
              {a.name}
              {a.archived ? ' (archivé)' : ''}
            </Text>
          </Pressable>
        ))}
      </View>

      <Pressable
        style={[styles.saveBtn, saving && { opacity: 0.6 }]}
        onPress={onSave}
        disabled={saving}
      >
        <Text style={styles.saveText}>Enregistrer</Text>
      </Pressable>

      {existing ? (
        <Pressable style={styles.deleteBtn} onPress={onDelete}>
          <Text style={styles.deleteText}>Supprimer</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 12, color: colors.text },
  label: { marginTop: 10, marginBottom: 4, color: colors.muted, fontWeight: '600' },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.divider,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
  },
  dateText: { color: colors.text, fontSize: 16 },
  row: { flexDirection: 'row', gap: 8 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: colors.chip,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chipActive: { backgroundColor: colors.accent },
  chipTextActive: { color: colors.onAccent, fontWeight: '700' },
  chipDisabled: { opacity: 0.5 },
  saveBtn: {
    marginTop: 20,
    backgroundColor: colors.success,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveText: { color: colors.onAccent, fontWeight: '700' },
  deleteBtn: {
    marginTop: 12,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#fadbd8',
  },
  deleteText: { color: '#c0392b', fontWeight: '700' },
});
