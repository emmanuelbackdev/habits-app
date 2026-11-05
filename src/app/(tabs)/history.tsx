import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ConsistencyChart } from '@/components/consistency-chart';
import { Section } from '@/components/habit-form';
import { StatTile } from '@/components/stat-tile';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { dateKey, daysAgo, relativeDayLabel } from '@/lib/dates';
import { bestStreak, consistency, countOn, doneDays, isDone, isPerfectDay } from '@/lib/habits';
import { useHabits } from '@/lib/habits-store';

const PAGE = 30;

export default function HistoryScreen() {
  const theme = useTheme();
  const { habits, challenges } = useHabits();
  const [historyDays, setHistoryDays] = useState(PAGE);

  const month = consistency(habits, 30);
  const rate = month.total ? Math.round((month.done / month.total) * 100) : 0;
  const perfectDays = Array.from({ length: 30 }, (_, i) => dateKey(daysAgo(i))).filter((k) => isPerfectDay(habits, k)).length;
  const best = Math.max(0, ...habits.map(bestStreak));
  const totalCheckIns = habits.reduce((s, h) => s + doneDays(h).length, 0);
  const wins = challenges.filter((c) => c.status === 'won').reverse();

  // History runs back to the earliest habit (or earliest logged day, for migrated data).
  const earliest = habits
    .flatMap((h) => [dateKey(new Date(h.createdAt)), ...Object.keys(h.log)])
    .reduce((min, k) => (k < min ? k : min), dateKey());
  const historyKeys = Array.from({ length: historyDays }, (_, i) => dateKey(daysAgo(i))).filter((k) => k >= earliest);
  const hasOlder = dateKey(daysAgo(historyDays)) >= earliest;

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        <View style={styles.hero} accessible accessibilityLabel={`${rate} percent consistency over the last 30 days`}>
          <ThemedText style={[styles.heroValue, { color: theme.success }]}>{rate}%</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            consistency over the last 30 days ({month.done} of {month.total} habit-days)
          </ThemedText>
        </View>

        <View style={styles.tiles}>
          <StatTile value={`${perfectDays}`} label="Perfect days (30d)" />
          <StatTile value={`${best}🔥`} label="Best streak" />
          <StatTile value={`${totalCheckIns}`} label="Days completed" />
          <StatTile value={`${wins.length}🏆`} label="Challenges won" />
        </View>

        <Section label="Last 14 days">
          <ConsistencyChart habits={habits} />
        </Section>

        {wins.length > 0 && (
          <Section label="Trophies">
            <View style={styles.trophies}>
              {wins.map((c) => {
                const h = habits.find((x) => x.id === c.habitId);
                return (
                  <ThemedView key={c.id} type="backgroundElement" style={styles.trophy}>
                    <ThemedText style={styles.trophyEmoji}>🏆</ThemedText>
                    <ThemedText type="smallBold">{c.days}-day</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                      {h ? `${h.emoji} ${h.name}` : 'Deleted habit'}
                    </ThemedText>
                    {c.endedAt && (
                      <ThemedText type="small" themeColor="textSecondary">
                        {new Date(c.endedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </ThemedText>
                    )}
                  </ThemedView>
                );
              })}
            </View>
          </Section>
        )}

        <Section label="History">
          <ThemedView type="backgroundElement" style={styles.log}>
            {historyKeys.map((key, i) => {
              const existing = habits.filter((h) => key >= dateKey(new Date(h.createdAt)) || countOn(h, key) > 0);
              const done = existing.filter((h) => isDone(h, key)).length;
              return (
                <View
                  key={key}
                  style={[styles.logRow, i > 0 && { borderTopColor: theme.backgroundSelected, borderTopWidth: StyleSheet.hairlineWidth }]}
                  accessible
                  accessibilityLabel={`${relativeDayLabel(key)}: ${done} of ${existing.length} done`}>
                  <View style={styles.logDay}>
                    <ThemedText type="smallBold">{relativeDayLabel(key)}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {existing.length && done === existing.length ? 'Perfect ✨' : `${done}/${existing.length}`}
                    </ThemedText>
                  </View>
                  <View style={styles.logChips}>
                    {existing.map((h) => {
                      const ok = isDone(h, key);
                      const n = countOn(h, key);
                      return (
                        <View
                          key={h.id}
                          style={[
                            styles.logChip,
                            { backgroundColor: ok ? h.color + '2E' : theme.backgroundSelected, opacity: ok || n > 0 ? 1 : 0.5 },
                          ]}>
                          <ThemedText type="small">
                            {h.emoji} {h.kind === 'count' ? `${n}/${h.target}` : ok ? '✓' : '–'}
                          </ThemedText>
                        </View>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </ThemedView>
          {hasOlder && (
            <Pressable onPress={() => setHistoryDays((d) => d + PAGE)} accessibilityRole="button" style={styles.more}>
              <ThemedText type="smallBold" style={{ color: theme.tint }}>
                Show older
              </ThemedText>
            </Pressable>
          )}
        </Section>

      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.four, gap: Spacing.four, paddingBottom: Spacing.six },
  hero: { gap: Spacing.one },
  heroValue: { fontSize: 56, lineHeight: 64, fontWeight: 800, fontVariant: ['tabular-nums'] },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  trophies: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  trophy: {
    width: 110,
    padding: Spacing.three,
    borderRadius: 16,
    alignItems: 'center',
    gap: Spacing.half,
    borderCurve: 'continuous',
  },
  trophyEmoji: { fontSize: 30, lineHeight: 36 },
  log: { borderRadius: 16, paddingHorizontal: Spacing.three, borderCurve: 'continuous' },
  logRow: { paddingVertical: Spacing.three, gap: Spacing.two },
  logDay: { flexDirection: 'row', justifyContent: 'space-between' },
  logChips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one },
  logChip: { paddingHorizontal: Spacing.two, paddingVertical: 2, borderRadius: 8 },
  more: { alignItems: 'center', paddingVertical: Spacing.two },
});
