import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { dateKey, lastNDays, relativeDayLabel, weekdayInitial } from '@/lib/dates';
import { isDone, type Habit } from '@/lib/habits';

const HEIGHT = 128;
/** Right-hand gutter that holds the gridline labels, so bars never sit under them. */
const GUTTER = 40;

type Day = { key: string; date: Date; done: number; total: number };

/**
 * Daily completion rate for the last `days` days: one bar per day, single series.
 * Tap a bar to read its exact numbers (the touch equivalent of a hover tooltip).
 */
export function ConsistencyChart({ habits, days = 14 }: { habits: Habit[]; days?: number }) {
  const theme = useTheme();
  const [selected, setSelected] = useState<string | null>(null);
  const today = dateKey();

  const data: Day[] = lastNDays(days).map((date) => {
    const key = dateKey(date);
    const existing = habits.filter((h) => key >= dateKey(new Date(h.createdAt)));
    return { key, date, done: existing.filter((h) => isDone(h, key)).length, total: existing.length };
  });
  const tracked = data.filter((d) => d.total > 0);
  const avg = tracked.length ? tracked.reduce((s, d) => s + d.done / d.total, 0) / tracked.length : 0;
  const sel = data.find((d) => d.key === selected);

  return (
    <View style={styles.wrap}>
      <ThemedText type="small" themeColor="textSecondary" style={styles.readout} accessibilityLiveRegion="polite">
        {sel ? (
          <>
            <ThemedText type="smallBold">{relativeDayLabel(sel.key)}</ThemedText>
            {sel.total ? `  ·  ${sel.done} of ${sel.total} habits  ·  ${Math.round((sel.done / sel.total) * 100)}%` : '  ·  no habits yet'}
          </>
        ) : (
          `Average ${Math.round(avg * 100)}% a day · tap a bar for details`
        )}
      </ThemedText>

      <View style={styles.plot}>
        {/* Recessive gridlines at 50% and 100%. */}
        {[1, 0.5].map((g) => (
          <View
            key={g}
            style={[styles.gridline, { bottom: HEIGHT * g, backgroundColor: theme.backgroundSelected }]}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.gridLabel}>
              {g * 100}%
            </ThemedText>
          </View>
        ))}
        <View style={[styles.baseline, { backgroundColor: theme.textSecondary }]} />

        <View style={styles.bars}>
          {data.map((d) => {
            const pct = d.total ? d.done / d.total : 0;
            const dim = selected !== null && selected !== d.key;
            return (
              <Pressable
                key={d.key}
                onPress={() => setSelected((s) => (s === d.key ? null : d.key))}
                style={styles.barSlot}
                accessibilityRole="button"
                accessibilityLabel={`${d.date.toDateString()}: ${d.done} of ${d.total} habits done`}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: pct > 0 ? Math.max(4, pct * HEIGHT) : 0,
                      backgroundColor: theme.success,
                      opacity: dim ? 0.35 : 1,
                    },
                  ]}
                />
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.axis}>
        {data.map((d) => (
          <ThemedText
            key={d.key}
            type={d.key === today ? 'smallBold' : 'small'}
            themeColor={d.key === today ? 'text' : 'textSecondary'}
            style={styles.axisLabel}>
            {weekdayInitial(d.date)}
          </ThemedText>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.two },
  readout: { minHeight: 20 },
  plot: { height: HEIGHT, marginTop: Spacing.two },
  gridline: { position: 'absolute', left: 0, right: GUTTER, height: StyleSheet.hairlineWidth, overflow: 'visible' },
  gridLabel: { position: 'absolute', right: -GUTTER, top: -7, width: GUTTER - 4, textAlign: 'right', fontSize: 11, lineHeight: 14 },
  baseline: { position: 'absolute', left: 0, right: GUTTER, bottom: 0, height: 1, opacity: 0.4 },
  bars: { position: 'absolute', top: 0, bottom: 0, left: 0, right: GUTTER, flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  barSlot: { flex: 1, height: '100%', justifyContent: 'flex-end' },
  bar: { borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  axis: { flexDirection: 'row', gap: 4, paddingRight: GUTTER },
  axisLabel: { flex: 1, textAlign: 'center', fontSize: 11, lineHeight: 14 },
});
