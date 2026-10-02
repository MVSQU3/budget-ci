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
import { formatXof } from '../utils/format';

/** Rouge dépense déjà utilisé par les montants ; revenu = vert Organic (accent 2). */
const EXPENSE_COLOR = '#c0392b';

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

  const amountDisplay = amount ? formatXof(Number(amount)).replace(/ F CFA$/, '') : '';
  const amountInputWidth = Math.max(40, (amountDisplay || '0').length * 24);
  const ctaLabel = existing
    ? 'Enregistrer'
    : type === 'depense'
      ? 'Ajouter la dépense'
      : 'Ajouter le revenu';
  const ctaColor = type === 'depense' ? EXPENSE_COLOR : colors.success;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.segment} accessibilityRole="tablist">
        {(['depense', 'revenu'] as OperationType[]).map((t) => {
          const selected = type === t;
          return (
            <Pressable
              key={t}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              style={[styles.segmentItem, selected && styles.segmentItemActive]}
              onPress={() => {
                setType(t);
                setCategoryId('');
              }}
            >
              <Text style={selected ? styles.segmentTextActive : styles.segmentText}>
                {t === 'depense' ? 'Dépense' : 'Revenu'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.amountBlock}>
        <View style={styles.amountLine}>
          <TextInput
            style={[styles.amountInput, { width: amountInputWidth }]}
            keyboardType="number-pad"
            value={amountDisplay}
            onChangeText={(text) => setAmount(text.replace(/\D/g, ''))}
            placeholder="0"
            placeholderTextColor={colors.muted}
            textAlign="right"
            accessibilityLabel="Montant en FCFA"
          />
          <Text style={styles.amountUnit}>FCFA</Text>
        </View>
      </View>

      <View style={styles.categories}>
        <Text style={styles.categoryLabel}>Catégorie</Text>
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
                <Text style={categoryId === c.id ? styles.chipTextActive : undefined}>
                  {c.name}
                  {!c.active ? ' (désactivée)' : ''}
                </Text>
              </Pressable>
            ))}
        </View>
      </View>

      <Pressable
        style={[styles.saveBtn, { backgroundColor: ctaColor }, saving && { opacity: 0.6 }]}
        onPress={onSave}
        disabled={saving}
        accessibilityRole="button"
      >
        <Text style={styles.saveText}>{ctaLabel}</Text>
      </Pressable>

      <View style={styles.lower}>
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
              <Text style={accountId === a.id ? styles.chipTextActive : undefined}>
                {a.name}
                {a.archived ? ' (archivé)' : ''}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

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
  content: {
    paddingTop: 20,
    paddingBottom: 20,
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.divider,
    padding: 4,
    marginHorizontal: 20,
    marginBottom: 16,
  },
  segmentItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
  },
  segmentItemActive: { backgroundColor: colors.accent },
  segmentText: { color: colors.text, fontWeight: '600' },
  segmentTextActive: { color: colors.onAccent, fontWeight: '700' },
  amountBlock: {
    alignItems: 'center',
    marginHorizontal: 20,
  },
  amountLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  amountInput: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
    paddingVertical: 4,
    paddingHorizontal: 0,
    includeFontPadding: false,
  },
  amountUnit: {
    marginLeft: 8,
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
    includeFontPadding: false,
  },
  categories: {
    paddingVertical: 0,
    paddingHorizontal: 20,
  },
  categoryLabel: {
    marginTop: 0,
    marginBottom: 8,
    color: colors.muted,
    fontWeight: '600',
  },
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
    marginTop: 6,
    marginHorizontal: 20,
    marginBottom: 26,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveText: { color: colors.onAccent, fontWeight: '700' },
  lower: {
    paddingHorizontal: 20,
  },
  deleteBtn: {
    marginTop: 12,
    marginHorizontal: 20,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#fadbd8',
  },
  deleteText: { color: '#c0392b', fontWeight: '700' },
});
