import React, { useState } from 'react';
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
import {
  addCategory,
  renameCategoryById,
  deactivateOrDeleteCategory,
  reactivateCategory,
} from '../services/BudgetService';
import { OperationType } from '../domain/types';
import { CategoryBadge } from '../components/CategoryBadge';
import { colors } from '../theme';

const COLORS = ['#e74c3c', '#e67e22', '#f1c40f', '#2ecc71', '#3498db', '#9b59b6', '#1abc9c', '#7f8c8d'];

export function CategoriesScreen() {
  const { snapshot, applySnapshot } = useBudget();
  const [name, setName] = useState('');
  const [type, setType] = useState<OperationType>('depense');
  const [editing, setEditing] = useState<{ id: string; value: string } | null>(
    null,
  );

  if (!snapshot) return null;

  const onAdd = async () => {
    try {
      const color = COLORS[Math.floor(Math.random() * COLORS.length)];
      applySnapshot(await addCategory(name, type, color, '🏷️'));
      setName('');
    } catch (e) {
      Alert.alert('Erreur', e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Catégories</Text>
      <View style={styles.row}>
        {(['depense', 'revenu'] as OperationType[]).map((t) => (
          <Pressable
            key={t}
            style={[styles.chip, type === t && styles.chipActive]}
            onPress={() => setType(t)}
          >
            <Text>{t === 'depense' ? 'Dépense' : 'Revenu'}</Text>
          </Pressable>
        ))}
      </View>
      <TextInput
        style={styles.input}
        placeholder="Nom de la catégorie"
        placeholderTextColor={colors.muted}
        value={name}
        onChangeText={setName}
      />
      <Pressable style={styles.addBtn} onPress={onAdd}>
        <Text style={styles.addText}>Ajouter</Text>
      </Pressable>

      {editing ? (
        <View style={{ gap: 8, marginVertical: 8 }}>
          <TextInput
            style={styles.input}
            value={editing.value}
            placeholderTextColor={colors.muted}
            onChangeText={(v) => setEditing({ ...editing, value: v })}
          />
          <Pressable
            style={styles.addBtn}
            onPress={async () => {
              try {
                applySnapshot(
                  await renameCategoryById(editing.id, editing.value),
                );
                setEditing(null);
              } catch (e) {
                Alert.alert(
                  'Erreur',
                  e instanceof Error ? e.message : String(e),
                );
              }
            }}
          >
            <Text style={styles.addText}>Enregistrer le nom</Text>
          </Pressable>
        </View>
      ) : null}

      <FlatList
        data={snapshot.categories}
        keyExtractor={(c) => c.id}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <CategoryBadge color={item.color} icon={item.icon} />
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>
                {item.name}
                {!item.active ? ' (désactivée)' : ''}
              </Text>
              <Text style={styles.meta}>
                {item.type === 'depense' ? 'Dépense' : 'Revenu'}
              </Text>
            </View>
            {item.active ? (
              <Pressable onPress={() => setEditing({ id: item.id, value: item.name })}>
                <Text>Renommer</Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={async () =>
                  applySnapshot(await reactivateCategory(item.id))
                }
              >
                <Text>Réactiver</Text>
              </Pressable>
            )}
            {item.active ? (
              <Pressable
                onPress={() =>
                  Alert.alert(
                    'Supprimer / désactiver',
                    'Si des opérations existent, la catégorie sera désactivée.',
                    [
                      { text: 'Annuler', style: 'cancel' },
                      {
                        text: 'Confirmer',
                        style: 'destructive',
                        onPress: async () => {
                          try {
                            applySnapshot(
                              await deactivateOrDeleteCategory(item.id),
                            );
                          } catch (e) {
                            Alert.alert(
                              'Erreur',
                              e instanceof Error ? e.message : String(e),
                            );
                          }
                        },
                      },
                    ],
                  )
                }
              >
                <Text style={{ color: '#c0392b', marginLeft: 8 }}>Retirer</Text>
              </Pressable>
            ) : null}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12, backgroundColor: colors.bg },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 8, color: colors.text },
  row: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  chip: {
    backgroundColor: colors.chip,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  chipActive: { backgroundColor: colors.accent },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.divider,
    padding: 10,
    marginBottom: 8,
    color: colors.text,
  },
  addBtn: {
    backgroundColor: colors.accent,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  addText: { color: colors.onAccent, fontWeight: '700' },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: 8,
    marginBottom: 6,
    gap: 8,
  },
  dot: { width: 12, height: 12, borderRadius: 6 },
  name: { fontWeight: '600', color: colors.text },
  meta: { fontSize: 12, color: colors.muted },
});
