import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { CheckButton } from '@/components/check-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { dateKey, lastNDays, weekdayInitial } from '@/lib/dates';
import { haptic } from '@/lib/feedback';
import { countOn, habitStreak, isDone, progressOn, type Habit } from '@/lib/habits';
import { useHabits } from '@/lib/habits-store';
import { useCheckIn } from '@/lib/use-check-in';

export function HabitCard({ habit, onPerfectDay }: { habit: Habit; onPerfectDay?: () => void }) {
  const theme = useTheme();
  const { setDayCount } = useHabits();
  const checkIn = useCheckIn();
  const [bounce, setBounce] = useState(0);
  const [burst, setBurst] = useState(0);

  const today = dateKey();
  const count = countOn(habit, today);
  const done = isDone(habit, today);
  const streak = habitStreak(habit);
  const isCount = habit.kind === 'count';

  const logToday = () => {
    const result = checkIn(habit, !isCount && done ? -1 : 1);
    if (result === 'progress' || result === 'complete' || result === 'perfect') setBounce((b) => b + 1);
    if (result === 'complete' || result === 'perfect') setBurst((b) => b + 1);
    if (result === 'perfect') onPerfectDay?.();
  };

  const undoToday = () => {
    if (count > 0) checkIn(habit, -1);
  };

  const togglePastDay = (key: string) => {
    haptic.light();
    setDayCount(habit.id, key, isDone(habit, key) ? 0 : habit.target);
  };

  const progressText = isCount ? `${count}/${habit.target} ${habit.unit || 'times'}` : done ? 'Done today' : 'Once a day';
  const streakText = streak > 0 ? `🔥 ${streak} day${streak === 1 ? '' : 's'}` : null;

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <View style={styles.row}>
        <Pressable
          onPress={() => router.push({ pathname: '/habit/[id]', params: { id: habit.id } })}
          accessibilityRole="button"
          accessibilityLabel={`${habit.name}. ${progressText}. ${streakText ? `${streak} day streak.` : ''}`}
          accessibilityHint="Opens history and settings"
          style={({ pressed }) => [styles.rowMain, pressed && styles.pressed]}>
          <View style={[styles.emojiBadge, { backgroundColor: habit.color + '26' }]}>
            <ThemedText style={styles.emoji}>{habit.emoji}</ThemedText>
          </View>
          <View style={styles.info}>
            <ThemedText numberOfLines={1}>{habit.name}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
              {progressText}
              {streakText ? `  ·  ${streakText}` : ''}
            </ThemedText>
          </View>
        </Pressable>
        <CheckButton
          color={habit.color}
          progress={progressOn(habit, today)}
          label={isCount ? `${count}/${habit.target}` : null}
          done={done}
          bounce={bounce}
          burst={burst}
          onPress={logToday}
          onLongPress={undoToday}
          accessibilityLabel={isCount ? `Log one ${habit.unit || 'time'} for ${habit.name}` : `Check off ${habit.name}`}
          accessibilityHint={isCount ? 'Long press to undo one' : undefined}
        />
      </View>

      <View style={styles.week}>
        {lastNDays(7).map((day) => {
          const key = dateKey(day);
          const isToday = key === today;
          const p = progressOn(habit, key);
          return (
            <Pressable
              key={key}
              onPress={() => (isToday ? logToday() : togglePastDay(key))}
              hitSlop={4}
              accessibilityLabel={`${day.toDateString()}, ${isDone(habit, key) ? 'done' : 'not done'}`}
              style={styles.dayCol}>
              <ThemedText
                type={isToday ? 'smallBold' : 'small'}
                themeColor={isToday ? 'text' : 'textSecondary'}>
                {weekdayInitial(day)}
              </ThemedText>
              <View style={[styles.dayDot, { backgroundColor: theme.backgroundSelected }]}>
                {p > 0 && <View style={[StyleSheet.absoluteFill, { backgroundColor: habit.color, opacity: p < 1 ? 0.25 + p * 0.45 : 1 }]} />}
              </View>
            </Pressable>
          );
        })}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: Spacing.three,
    gap: Spacing.three,
    borderCurve: 'continuous',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  pressed: { opacity: 0.6 },
  emojiBadge: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 24, lineHeight: 30 },
  info: { flex: 1, gap: Spacing.half },
  week: { flexDirection: 'row', justifyContent: 'space-between' },
  dayCol: { alignItems: 'center', gap: Spacing.one, minWidth: 32 },
  dayDot: { width: 22, height: 22, borderRadius: 11, overflow: 'hidden' },
});
