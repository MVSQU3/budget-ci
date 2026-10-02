import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Category, Operation } from '../domain/types';
import { formatDateFr } from '../domain/dates';
import { AmountText } from './AmountText';
import { CategoryBadge } from './CategoryBadge';
import { colors } from '../theme';

export function OperationRow({
  operation,
  category,
  accountName,
  exceeded,
  onPress,
}: {
  operation: Operation;
  category?: Category;
  accountName?: string;
  exceeded: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.opRow} onPress={onPress}>
      {category ? (
        <CategoryBadge color={category.color} icon={category.icon} />
      ) : null}
      <View style={styles.opBody}>
        <Text style={styles.opLabel}>
          {operation.label}
          {exceeded ? ' ⚠ plafond' : ''}
        </Text>
        <Text style={styles.opMeta}>
          {formatDateFr(operation.date)} · {category?.name ?? '?'} · {accountName ?? '?'}
          {category && !category.active ? ' (cat. désactivée)' : ''}
        </Text>
      </View>
      <AmountText
        value={operation.type === 'revenu' ? operation.amount : -operation.amount}
        tone={operation.type === 'revenu' ? 'income' : 'expense'}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  opRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  opBody: { flex: 1 },
  opLabel: { fontWeight: '600', color: colors.text },
  opMeta: { fontSize: 12, color: colors.muted, marginTop: 2 },
});
