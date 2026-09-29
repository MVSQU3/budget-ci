import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useBudget } from '../context/BudgetContext';
import { RootStackParamList } from '../navigation/types';
import { joinWithCode } from '../sync/actions';
import { isSyncCode, isVaultId, normalizeSyncCode, parseSharedJoinText } from '../sync/code';
import { syncColors } from '../sync/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Rejoindre'>;

export function SyncJoinScreen({ navigation }: Props) {
  const { refresh } = useBudget();
  const [code, setCode] = useState('');
  const [vaultId, setVaultId] = useState('');
  const [busy, setBusy] = useState(false);
  const ready = isSyncCode(code) && isVaultId(vaultId) && !busy;

  const onChangeCode = (value: string) => {
    if (value.includes('-') || value.includes('\n') || value.length > 8) {
      const parsed = parseSharedJoinText(value);
      if (parsed.code) setCode(parsed.code);
      if (parsed.vaultId) setVaultId(parsed.vaultId);
      return;
    }
    setCode(normalizeSyncCode(value));
  };

  const onValidate = async () => {
    setBusy(true);
    try {
      await joinWithCode(code, vaultId);
      await refresh();
      navigation.goBack();
    } catch (error) {
      Alert.alert('Rejoindre', error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Rejoindre un coffre</Text>
      <Text style={styles.copy}>
        Saisissez le code à 8 caractères de l’autre appareil pour relier celui-ci,
        sans compte email.
      </Text>

      <Text style={styles.label}>Code</Text>
      <TextInput
        style={styles.codeInput}
        value={code}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={80}
        placeholder="8 caractères"
        placeholderTextColor={syncColors.muted}
        onChangeText={onChangeCode}
      />

      <Text style={styles.label}>Identifiant du coffre</Text>
      <TextInput
        style={styles.input}
        value={vaultId}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="Identifiant indiqué sur l’appareil déjà connecté"
        placeholderTextColor={syncColors.muted}
        onChangeText={setVaultId}
      />
      <Text style={styles.hint}>
        L’API exige ce coffre en plus du code. Vous pouvez aussi coller le message partagé
        dans le champ code.
      </Text>

      <Pressable
        style={[styles.primaryBtn, !ready && styles.disabled]}
        disabled={!ready}
        onPress={() => void onValidate()}
      >
        <Text style={styles.primaryText}>{busy ? 'Vérification…' : 'Valider'}</Text>
      </Pressable>
      <Pressable style={styles.secondaryBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.secondaryText}>Annuler</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, backgroundColor: syncColors.background, gap: 10 },
  title: { fontSize: 22, fontWeight: '700', color: syncColors.text },
  copy: { color: syncColors.muted, lineHeight: 22 },
  label: { marginTop: 8, fontWeight: '600', color: syncColors.text },
  hint: { color: syncColors.muted, fontSize: 13, lineHeight: 18 },
  codeInput: {
    backgroundColor: syncColors.card,
    borderWidth: 1,
    borderColor: syncColors.primaryMuted,
    borderRadius: 12,
    paddingVertical: 14,
    textAlign: 'center',
    fontSize: 24,
    letterSpacing: 4,
    fontWeight: '700',
    color: syncColors.text,
  },
  input: {
    backgroundColor: syncColors.card,
    borderWidth: 1,
    borderColor: syncColors.border,
    borderRadius: 12,
    padding: 12,
    color: syncColors.text,
  },
  primaryBtn: {
    backgroundColor: syncColors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  secondaryBtn: {
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryText: { color: syncColors.primary, fontWeight: '700' },
  disabled: { opacity: 0.45 },
});
