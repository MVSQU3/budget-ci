import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useBudget } from '../context/BudgetContext';
import { RootStackParamList } from '../navigation/types';
import {
  changeSyncCode,
  connectWithCode,
  disableSync,
  readSyncState,
  syncNow,
} from '../sync/actions';
import { generateSyncCode, isSyncCode, normalizeSyncCode } from '../sync/code';
import { syncColors } from '../sync/theme';
import { SyncScreenState } from '../sync/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Synchronisation'>;

export function SyncScreen({ navigation }: Props) {
  const { refresh } = useBudget();
  const [state, setState] = useState<SyncScreenState | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const next = await readSyncState();
    setState(next);
    await refresh();
  }, [refresh]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      readSyncState()
        .then((next) => {
          if (active) setState(next);
        })
        .catch((error: unknown) => {
          if (active) {
            setLoadError(error instanceof Error ? error.message : String(error));
          }
        });
      return () => {
        active = false;
      };
    }, []),
  );

  if (loadError) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{loadError}</Text>
      </View>
    );
  }
  if (!state) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={syncColors.primary} />
      </View>
    );
  }
  if (state.enabled) {
    return <EnabledView state={state} onChanged={reload} />;
  }
  return (
    <ActivationView
      storedCode={state.code}
      onJoin={() => navigation.navigate('Rejoindre')}
      onConnected={reload}
    />
  );
}

function ActivationView({
  storedCode,
  onJoin,
  onConnected,
}: {
  storedCode: string | null;
  onJoin: () => void;
  onConnected: () => Promise<void>;
}) {
  const [code, setCode] = useState(storedCode ?? generateSyncCode());
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const matches = confirm.length > 0 && confirm === code;
  const ready = isSyncCode(code) && matches && !busy;

  const onConnect = async () => {
    if (!isSyncCode(code)) {
      Alert.alert('Code', 'Le code doit contenir 8 caractères alphanumériques.');
      return;
    }
    if (confirm !== code) {
      Alert.alert('Confirmation', 'Retapez le code pour confirmer que vous l’avez noté.');
      return;
    }
    setBusy(true);
    try {
      await connectWithCode(code);
      await onConnected();
    } catch (error) {
      Alert.alert('Connexion', error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.headerRow}>
        <Text style={styles.title}>Synchronisation</Text>
        <Badge label="Hors ligne" tone="off" />
      </View>
      <View style={styles.card}>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Synchronisation</Text>
          <Switch
            value={false}
            onValueChange={() =>
              Alert.alert(
                'Synchronisation',
                'Confirmez le code, puis appuyez sur Connecter.',
              )
            }
            trackColor={{ false: '#E2E8F0', true: '#C7D2FE' }}
            thumbColor="#94A3B8"
          />
        </View>
        <Text style={styles.help}>
          La synchronisation est désactivée. Vos comptes, catégories et opérations
          restent sur cet appareil.
        </Text>
        {storedCode ? (
          <Text style={styles.hint}>
            Un coffre est déjà enregistré. Le même code le réactive.
          </Text>
        ) : null}
      </View>

      <Text style={styles.label}>Code secret</Text>
      <TextInput
        style={styles.codeInput}
        value={code}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={8}
        onChangeText={(value) => {
          setCode(normalizeSyncCode(value));
          setConfirm('');
        }}
      />
      <Text style={styles.hint}>8 caractères alphanumériques</Text>
      <Pressable
        onPress={() => {
          setCode(generateSyncCode());
          setConfirm('');
        }}
      >
        <Text style={styles.link}>Générer un autre code</Text>
      </Pressable>

      <Text style={styles.label}>Confirmer le code</Text>
      <TextInput
        style={styles.codeInput}
        value={confirm}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={8}
        placeholder="Retapez le code"
        placeholderTextColor={syncColors.muted}
        onChangeText={(value) => setConfirm(normalizeSyncCode(value))}
      />

      <Pressable
        style={[styles.primaryBtn, !ready && styles.disabled]}
        disabled={!ready}
        onPress={() => void onConnect()}
      >
        <Text style={styles.primaryText}>{busy ? 'Connexion…' : 'Connecter'}</Text>
      </Pressable>

      <Pressable style={styles.secondaryBtn} onPress={onJoin}>
        <Text style={styles.secondaryText}>Rejoindre un autre appareil</Text>
      </Pressable>
    </ScrollView>
  );
}

function EnabledView({
  state,
  onChanged,
}: {
  state: SyncScreenState;
  onChanged: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [nextCode, setNextCode] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);

  const share = async () => {
    if (!state.code || !state.vaultId) return;
    await Share.share({
      message: `Code budget-ci : ${state.code}\nIdentifiant du coffre : ${state.vaultId}\nSans compte email.`,
    });
  };

  const onSync = async () => {
    setBusy(true);
    try {
      await syncNow();
      await onChanged();
    } catch (error) {
      Alert.alert('Synchronisation', error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };

  const onDisable = () => {
    Alert.alert(
      'Désactiver',
      'Les données restent sur cet appareil. Aucune synchro tant que vous ne reconnectez pas.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Désactiver',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              await disableSync();
              await onChanged();
            })();
          },
        },
      ],
    );
  };

  const onChangeCode = async () => {
    if (!isSyncCode(nextCode) || nextCode !== confirm) {
      Alert.alert('Code', 'Saisissez puis confirmez un code de 8 caractères.');
      return;
    }
    Alert.alert(
      'Modifier le code',
      'Un nouveau coffre est créé. Les autres appareils devront le rejoindre avec ce code.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Modifier',
          onPress: () => {
            void (async () => {
              setBusy(true);
              try {
                await changeSyncCode(nextCode);
                setEditing(false);
                setNextCode('');
                setConfirm('');
                await onChanged();
              } catch (error) {
                Alert.alert(
                  'Code',
                  error instanceof Error ? error.message : String(error),
                );
              } finally {
                setBusy(false);
              }
            })();
          },
        },
      ],
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Synchronisation</Text>
        <Badge label="Synchronisé" tone="on" />
      </View>
      <View style={styles.card}>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Synchronisation</Text>
          <Switch
            value
            onValueChange={() => onDisable()}
            trackColor={{ false: '#E2E8F0', true: '#C7D2FE' }}
            thumbColor={syncColors.primary}
          />
        </View>
        <Text style={styles.help}>
          {state.lastSyncAt
            ? `Dernière synchro : ${formatStamp(state.lastSyncAt)}`
            : 'Pas encore synchronisé.'}
        </Text>
        {state.lastError ? <Text style={styles.error}>{state.lastError}</Text> : null}
      </View>

      <Text style={styles.section}>Synchronisés</Text>
      <View style={styles.card}>
        <Count label="Opérations" value={state.counts.operations} />
        <Count label="Comptes" value={state.counts.accounts} />
        <Count label="Catégories" value={state.counts.categories} />
        {state.pending > 0 ? (
          <Text style={styles.hint}>{state.pending} modification(s) en attente d’envoi</Text>
        ) : null}
      </View>

      <Text style={styles.section}>Code de l’appareil</Text>
      <View style={styles.card}>
        <Text style={styles.codeValue}>{state.code ?? '—'}</Text>
        <Text style={styles.hint}>Identifiant du coffre</Text>
        <Text style={styles.vault}>{state.vaultId ?? '—'}</Text>
        <Pressable onPress={() => void share()}>
          <Text style={styles.link}>Partager le code</Text>
        </Pressable>
        <Pressable onPress={() => setEditing((value) => !value)}>
          <Text style={styles.link}>Modifier le code</Text>
        </Pressable>
        {editing ? (
          <View style={styles.editBox}>
            <TextInput
              style={styles.input}
              value={nextCode}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={8}
              placeholder="Nouveau code"
              placeholderTextColor={syncColors.muted}
              onChangeText={(value) => setNextCode(normalizeSyncCode(value))}
            />
            <TextInput
              style={styles.input}
              value={confirm}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={8}
              placeholder="Confirmer le code"
              placeholderTextColor={syncColors.muted}
              onChangeText={(value) => setConfirm(normalizeSyncCode(value))}
            />
            <Pressable style={styles.primaryBtn} onPress={() => void onChangeCode()}>
              <Text style={styles.primaryText}>Enregistrer</Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      <Pressable
        style={[styles.primaryBtn, busy && styles.disabled]}
        disabled={busy}
        onPress={() => void onSync()}
      >
        <Text style={styles.primaryText}>
          {busy ? 'Synchronisation…' : 'Synchroniser maintenant'}
        </Text>
      </Pressable>
      <Pressable style={styles.secondaryBtn} onPress={onDisable}>
        <Text style={styles.secondaryText}>Désactiver</Text>
      </Pressable>
      <Text style={styles.note}>
        Si deux appareils modifient la même donnée, la version la plus récente est
        conservée.
      </Text>
    </ScrollView>
  );
}

function Badge({ label, tone }: { label: string; tone: 'on' | 'off' }) {
  return (
    <View style={[styles.badge, tone === 'on' ? styles.badgeOn : styles.badgeOff]}>
      <Text style={tone === 'on' ? styles.badgeOnText : styles.badgeOffText}>{label}</Text>
    </View>
  );
}

function Count({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.countRow}>
      <Text style={styles.countLabel}>{label}</Text>
      <Text style={styles.countValue}>{value}</Text>
    </View>
  );
}

function formatStamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString('fr-FR');
}

const styles = StyleSheet.create({
  content: { padding: 16, backgroundColor: syncColors.background, gap: 10 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: syncColors.background,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { fontSize: 22, fontWeight: '700', color: syncColors.text },
  card: {
    backgroundColor: syncColors.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: syncColors.border,
    gap: 8,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchLabel: { fontSize: 16, fontWeight: '600', color: syncColors.text },
  help: { color: syncColors.muted, lineHeight: 20 },
  label: { marginTop: 6, fontWeight: '600', color: syncColors.text },
  hint: { color: syncColors.muted, fontSize: 13 },
  codeInput: {
    backgroundColor: syncColors.card,
    borderWidth: 1,
    borderColor: syncColors.primaryMuted,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    fontSize: 24,
    letterSpacing: 4,
    textAlign: 'center',
    color: syncColors.text,
    fontWeight: '700',
  },
  input: {
    backgroundColor: syncColors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: syncColors.border,
    padding: 12,
    color: syncColors.text,
    letterSpacing: 2,
  },
  link: { color: syncColors.primary, fontWeight: '700', paddingVertical: 4 },
  primaryBtn: {
    backgroundColor: syncColors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 6,
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
  error: { color: syncColors.danger },
  section: { marginTop: 8, fontWeight: '700', color: syncColors.text },
  countRow: { flexDirection: 'row', justifyContent: 'space-between' },
  countLabel: { color: syncColors.text, fontSize: 16 },
  countValue: { color: syncColors.primary, fontWeight: '700', fontSize: 16 },
  codeValue: {
    fontSize: 28,
    letterSpacing: 4,
    fontWeight: '700',
    color: syncColors.text,
    textAlign: 'center',
  },
  vault: { color: syncColors.text, fontSize: 13 },
  editBox: { gap: 8 },
  note: { color: syncColors.muted, lineHeight: 20, marginTop: 4, marginBottom: 24 },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  badgeOff: { backgroundColor: syncColors.badgeOffBg },
  badgeOn: { backgroundColor: syncColors.badgeOnBg },
  badgeOffText: { color: syncColors.badgeOffText, fontWeight: '700', fontSize: 12 },
  badgeOnText: { color: syncColors.badgeOnText, fontWeight: '700', fontSize: 12 },
});
