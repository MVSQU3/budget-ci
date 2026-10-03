import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useBudget } from '../context/BudgetContext';
import { getMonthView, setCeiling } from '../services/BudgetService';
import { formatMonthLabel } from '../domain/dates';
import { formatXof } from '../utils/format';
import { CategoryBadge } from '../components/CategoryBadge';
import { colors } from '../theme';

const OVERSPEND_COLOR = '#c0392b';

/** Plafonds du mois, dans la structure de la maquette Budgets. */
export function CeilingsScreen() {
  const { snapshot, monthKey, applySnapshot } = useBudget();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  const view = useMemo(() => {
    if (!snapshot) return null;
    return getMonthView(snapshot, monthKey);
  }, [snapshot, monthKey]);

  if (!snapshot || !view) return null;

  const expenseCats = snapshot.categories.filter((c) => c.type === 'depense');
  const editing = expenseCats.find((c) => c.id === editingId) ?? null;

  const openEditor = (categoryId: string) => {
    const status = view.ceilingStatuses.find((s) => s.categoryId === categoryId);
    setDraft(
      status?.ceiling !== null && status?.ceiling !== undefined
        ? String(status.ceiling)
        : '',
    );
    setEditingId(categoryId);
  };

  const closeEditor = () => {
    if (saving) return;
    setEditingId(null);
    setDraft('');
  };

  const onSave = async () => {
    if (!editingId || saving) return;
    const amount = Number(draft);
    if (!Number.isInteger(amount) || amount < 0) {
      Alert.alert('Erreur', 'Le plafond doit être un entier >= 0.');
      return;
    }
    setSaving(true);
    try {
      applySnapshot(await setCeiling(monthKey, editingId, amount));
      setEditingId(null);
      setDraft('');
    } catch (e) {
      Alert.alert('Erreur', e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Budgets</Text>
      <Text style={styles.subtitle}>
        Limites mensuelles — {formatMonthLabel(monthKey)}
      </Text>
      <FlatList
        data={expenseCats}
        keyExtractor={(c) => c.id}
        style={styles.list}
        ItemSeparatorComponent={ListGap}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => {
          const status = view.ceilingStatuses.find(
            (s) => s.categoryId === item.id,
          );
          const spent = status?.spent ?? 0;
          const ceiling = status?.ceiling ?? null;
          const figures = ceilingFigures(spent, ceiling);
          const name = `${item.name}${!item.active ? ' (désactivée)' : ''}`;
          return (
            <Pressable
              style={styles.card}
              onPress={() => openEditor(item.id)}
              accessibilityRole="button"
              accessibilityLabel={`${name}. ${figures}`}
              accessibilityHint="Modifier le plafond"
            >
              <View style={styles.topRow}>
                <View style={styles.nameRow}>
                  <CategoryBadge color={item.color} icon={item.icon} />
                  <Text style={styles.name}>{name}</Text>
                </View>
                <Text
                  style={[
                    styles.figures,
                    ceiling === null && styles.figuresEmpty,
                  ]}
                >
                  {figures}
                </Text>
              </View>
              <CeilingBar spent={spent} ceiling={ceiling} />
              {status?.exceeded ? (
                <Text style={styles.alert}>⚠ Dépassé</Text>
              ) : null}
            </Pressable>
          );
        }}
      />

      <Modal
        visible={editing !== null}
        transparent
        animationType="fade"
        onRequestClose={closeEditor}
      >
        <KeyboardAvoidingView
          style={styles.modalRoot}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable
            style={styles.backdrop}
            onPress={closeEditor}
            accessibilityLabel="Annuler"
          />
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>{editing?.name}</Text>
            <Text style={styles.dialogLabel}>Plafond (F CFA)</Text>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              placeholder="Montant"
              placeholderTextColor={colors.muted}
              value={draft}
              onChangeText={setDraft}
              autoFocus
              selectTextOnFocus
              editable={!saving}
            />
            <View style={styles.dialogActions}>
              <Pressable
                style={styles.cancelBtn}
                onPress={closeEditor}
                disabled={saving}
                accessibilityRole="button"
              >
                <Text style={styles.cancelText}>Annuler</Text>
              </Pressable>
              <Pressable
                style={styles.saveBtn}
                onPress={onSave}
                disabled={saving}
                accessibilityRole="button"
              >
                <Text style={styles.saveText}>Enregistrer</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function ListGap() {
  return <View style={styles.gap} />;
}

function CeilingBar({
  spent,
  ceiling,
}: {
  spent: number;
  ceiling: number | null;
}) {
  const ratio = fillRatio(spent, ceiling);
  const exceeded = ceiling !== null && spent > ceiling;
  return (
    <View
      style={styles.track}
      accessibilityRole="progressbar"
      accessibilityValue={{
        min: 0,
        max: ceiling ?? 0,
        now: ceiling === null ? 0 : Math.min(spent, ceiling),
      }}
    >
      <View
        style={[
          styles.fill,
          {
            width: `${ratio * 100}%`,
            backgroundColor: exceeded ? OVERSPEND_COLOR : colors.accent,
          },
        ]}
      />
    </View>
  );
}

function ceilingFigures(spent: number, ceiling: number | null): string {
  if (ceiling === null) return 'Définir un budget';
  return `${formatXof(spent)} / ${formatXof(ceiling)}`;
}

function fillRatio(spent: number, ceiling: number | null): number {
  if (ceiling === null || ceiling <= 0) {
    return ceiling === 0 && spent > 0 ? 1 : 0;
  }
  return Math.min(spent / ceiling, 1);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: colors.bg,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    color: colors.muted,
    marginTop: 4,
    marginBottom: 16,
    fontSize: 13,
  },
  list: { flex: 1 },
  gap: { height: 10 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 16,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 10,
  },
  nameRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: { flex: 1, fontWeight: '700', color: colors.text },
  figures: {
    flexShrink: 1,
    textAlign: 'right',
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  figuresEmpty: { color: colors.accent, fontWeight: '700' },
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.chip,
    overflow: 'hidden',
  },
  fill: { height: '100%' },
  alert: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '700',
    color: OVERSPEND_COLOR,
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(32, 30, 29, 0.45)',
  },
  dialog: {
    backgroundColor: colors.bg,
    borderRadius: 8,
    padding: 16,
    gap: 8,
  },
  dialogTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  dialogLabel: { color: colors.muted, fontWeight: '600', fontSize: 13 },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.divider,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
  },
  dialogActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  cancelBtn: {
    flex: 1,
    backgroundColor: colors.chip,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelText: { color: colors.text, fontWeight: '700' },
  saveBtn: {
    flex: 1,
    backgroundColor: colors.accent,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveText: { color: colors.onAccent, fontWeight: '700' },
});
