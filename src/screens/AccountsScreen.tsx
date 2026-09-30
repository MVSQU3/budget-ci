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
  addAccount,
  renameAccountById,
  archiveOrDeleteAccount,
} from '../services/BudgetService';
import { AmountText } from '../components/AmountText';
import { colors } from '../theme';

export function AccountsScreen() {
  const { snapshot, applySnapshot } = useBudget();
  const [name, setName] = useState('');
  const [opening, setOpening] = useState('0');
  const [editing, setEditing] = useState<{ id: string; value: string } | null>(
    null,
  );

  if (!snapshot) return null;

  const onAdd = async () => {
    const openingBalance = Number(opening);
    if (!Number.isInteger(openingBalance)) {
      Alert.alert('Erreur', 'Le solde de départ doit être un entier.');
      return;
    }
    try {
      const snap = await addAccount(name, openingBalance);
      applySnapshot(snap);
      setName('');
      setOpening('0');
    } catch (e) {
      Alert.alert('Erreur', e instanceof Error ? e.message : String(e));
    }
  };

  const onRemove = (id: string, accountName: string) => {
    Alert.alert(
      'Supprimer / archiver',
      `Si le compte « ${accountName} » a des opérations, il sera archivé.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          style: 'destructive',
          onPress: async () => {
            try {
              applySnapshot(await archiveOrDeleteAccount(id));
            } catch (e) {
              Alert.alert('Erreur', e instanceof Error ? e.message : String(e));
            }
          },
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Comptes</Text>
      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Nom du compte"
          placeholderTextColor={colors.muted}
          value={name}
          onChangeText={setName}
        />
        <TextInput
          style={styles.input}
          placeholder="Solde de départ"
          placeholderTextColor={colors.muted}
          keyboardType="number-pad"
          value={opening}
          onChangeText={setOpening}
        />
        <Pressable style={styles.addBtn} onPress={onAdd}>
          <Text style={styles.addText}>Ajouter</Text>
        </Pressable>
      </View>

      {editing ? (
        <View style={styles.editBox}>
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
                applySnapshot(await renameAccountById(editing.id, editing.value));
                setEditing(null);
              } catch (e) {
                Alert.alert('Erreur', e instanceof Error ? e.message : String(e));
              }
            }}
          >
            <Text style={styles.addText}>Enregistrer le nom</Text>
          </Pressable>
        </View>
      ) : null}

      <FlatList
        data={snapshot.accounts}
        keyExtractor={(a) => a.id}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>
                {item.name}
                {item.archived ? ' (archivé)' : ''}
              </Text>
              <AmountText
                value={snapshot.balances[item.id] ?? 0}
                tone={
                  (snapshot.balances[item.id] ?? 0) < 0 ? 'danger' : 'neutral'
                }
              />
            </View>
            {!item.archived ? (
              <Pressable
                style={styles.link}
                onPress={() => setEditing({ id: item.id, value: item.name })}
              >
                <Text>Renommer</Text>
              </Pressable>
            ) : null}
            {!item.archived ? (
              <Pressable
                style={styles.linkDanger}
                onPress={() => onRemove(item.id, item.name)}
              >
                <Text style={{ color: '#c0392b' }}>Archiver/Suppr.</Text>
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
  form: { gap: 8, marginBottom: 12 },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.divider,
    padding: 10,
    color: colors.text,
  },
  addBtn: {
    backgroundColor: colors.accent,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  addText: { color: colors.onAccent, fontWeight: '700' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: 8,
    marginBottom: 6,
    gap: 8,
  },
  name: { fontWeight: '600', marginBottom: 4, color: colors.text },
  link: { padding: 6 },
  linkDanger: { padding: 6 },
  editBox: { gap: 8, marginBottom: 12 },
});
