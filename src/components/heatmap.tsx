import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { addDays, dateKey } from '@/lib/dates';
import { progressOn, type Habit } from '@/lib/habits';

const WEEKS = 16;
const GAP = 3;
const ROW_LABELS = ['S', '', 'T', '', 'T', '', 'S'];

/**
 * GitHub-style consistency grid: one column per week (Sun→Sat), oldest on the left.
 * Single-hue sequential scale: empty → partial → done, all in the habit's color.
 */
export function Heatmap({
  habit,
  selected,
  onSelect,
  horizontalPadding,
}: {
  habit: Habit;
  selected: string | null;
  onSelect: (key: string) => void;
  /** Total horizontal padding around the grid, used to size cells to the screen. */
  horizontalPadding: number;
}) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const labelWidth = 14;
  const cell = Math.min(22, Math.floor((Math.min(width, 640) - horizontalPadding - labelWidth - GAP * WEEKS) / WEEKS));

  const now = new Date();
  const today = dateKey(now);
  const thisSunday = addDays(now, -now.getDay());
  const firstSunday = addDays(thisSunday, -(WEEKS - 1) * 7);
  const createdKey = dateKey(new Date(habit.createdAt));

  const fillFor = (p: number) => (p >= 1 ? 1 : p > 0 ? 0.3 + p * 0.4 : 0);

  return (
    <View style={styles.wrap}>
      <View style={styles.grid}>
        <View style={[styles.column, { width: labelWidth }]}>
          {ROW_LABELS.map((l, i) => (
            <View key={i} style={{ height: cell, justifyContent: 'center' }}>
              <ThemedText type="small" themeColor="textSecondary" style={styles.rowLabel}>
                {l}
              </ThemedText>
            </View>
          ))}
        </View>
        {Array.from({ length: WEEKS }, (_, w) => (
          <View key={w} style={styles.column}>
            {Array.from({ length: 7 }, (_, d) => {
              const date = addDays(firstSunday, w * 7 + d);
              const key = dateKey(date);
              if (key > today) return <View key={key} style={{ width: cell, height: cell }} />;
              const p = progressOn(habit, key);
              const beforeStart = key < createdKey && p === 0;
              const isSelected = key === selected;
              return (
                <Pressable
                  key={key}
                  onPress={() => onSelect(key)}
                  hitSlop={1}
                  accessibilityRole="button"
                  accessibilityLabel={`${date.toDateString()}, ${p >= 1 ? 'done' : p > 0 ? 'partly done' : 'not done'}`}
                  style={[
                    styles.cell,
                    {
                      width: cell,
                      height: cell,
                      borderRadius: Math.max(3, cell / 4),
                      backgroundColor: theme.backgroundSelected,
                      opacity: beforeStart ? 0.45 : 1,
                    },
                    key === today && { borderWidth: 1.5, borderColor: theme.textSecondary },
                    isSelected && { borderWidth: 2, borderColor: theme.text },
                  ]}>
                  {p > 0 && (
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: habit.color, opacity: fillFor(p) }]} />
                  )}
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>

      <View style={styles.legend} accessibilityElementsHidden>
        <ThemedText type="small" themeColor="textSecondary">
          {WEEKS} weeks
        </ThemedText>
        <View style={styles.legendScale}>
          <ThemedText type="small" themeColor="textSecondary">
            Less
          </ThemedText>
          {[0, 0.5, 1].map((p) => (
            <View key={p} style={[styles.legendCell, { backgroundColor: theme.backgroundSelected }]}>
              {p > 0 && <View style={[StyleSheet.absoluteFill, { backgroundColor: habit.color, opacity: fillFor(p) }]} />}
            </View>
          ))}
          <ThemedText type="small" themeColor="textSecondary">
            More
          </ThemedText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.two },
  grid: { flexDirection: 'row', gap: GAP },
  column: { gap: GAP },
  rowLabel: { fontSize: 10, lineHeight: 12 },
  cell: { overflow: 'hidden' },
  legend: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  legendScale: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendCell: { width: 12, height: 12, borderRadius: 3, overflow: 'hidden' },
});
