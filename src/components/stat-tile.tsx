import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

/** A single headline number with a label. */
export function StatTile({ value, label }: { value: string; label: string }) {
  return (
    <ThemedView type="backgroundElement" style={styles.tile} accessible accessibilityLabel={`${label}: ${value}`}>
      <ThemedText style={styles.value}>{value}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  tile: {
    flexGrow: 1,
    flexBasis: '40%',
    padding: Spacing.three,
    borderRadius: 16,
    borderCurve: 'continuous',
    gap: Spacing.half,
  },
  value: { fontSize: 26, lineHeight: 32, fontWeight: 700, fontVariant: ['tabular-nums'] },
});
