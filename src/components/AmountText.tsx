import React from 'react';
import { Text, StyleSheet, TextStyle } from 'react-native';
import { formatXof } from '../utils/format';
import { colors } from '../theme';

export function AmountText({
  value,
  style,
  tone,
}: {
  value: number;
  style?: TextStyle;
  tone?: 'income' | 'expense' | 'neutral' | 'danger';
}) {
  const color =
    tone === 'income'
      ? colors.successText
      : tone === 'expense'
        ? '#c0392b'
        : tone === 'danger'
          ? '#922b21'
          : colors.text;
  return (
    <Text style={[styles.text, { color }, style]}>{formatXof(value)}</Text>
  );
}

const styles = StyleSheet.create({
  text: { fontWeight: '600', fontSize: 15 },
});
