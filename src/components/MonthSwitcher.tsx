import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { formatMonthLabel } from '../domain/dates';
import { colors } from '../theme';

export function MonthSwitcher({
  monthKey,
  onPrevious,
  onNext,
}: {
  monthKey: string;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <View style={styles.monthNav}>
      <TouchableOpacity
        onPress={onPrevious}
        style={styles.navBtn}
        accessibilityRole="button"
        accessibilityLabel="Mois précédent"
      >
        <Text style={styles.navBtnText}>‹</Text>
      </TouchableOpacity>
      <Text style={styles.monthTitle}>{formatMonthLabel(monthKey)}</Text>
      <TouchableOpacity
        onPress={onNext}
        style={styles.navBtn}
        accessibilityRole="button"
        accessibilityLabel="Mois suivant"
      >
        <Text style={styles.navBtnText}>›</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navBtn: { padding: 10 },
  navBtnText: { fontSize: 28, color: colors.accent },
  monthTitle: {
    fontSize: 20,
    fontWeight: '700',
    textTransform: 'capitalize',
    color: colors.text,
  },
});
