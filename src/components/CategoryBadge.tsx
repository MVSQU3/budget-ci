import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { displayCategoryIcon } from '../utils/categoryIcon';

type Props = {
  color: string;
  icon?: string | null;
  size?: number;
  style?: ViewStyle;
};

/** Pastille couleur + icône (emoji) à côté, pour listes de catégories. */
export function CategoryBadge({ color, icon, size = 12, style }: Props) {
  const emoji = displayCategoryIcon(icon);
  return (
    <View style={[styles.row, style]}>
      <View
        style={[
          styles.dot,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color,
          },
        ]}
      />
      <Text style={[styles.icon, { fontSize: Math.max(14, size + 2) }]}>
        {emoji}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: {},
  icon: { lineHeight: 18 },
});
