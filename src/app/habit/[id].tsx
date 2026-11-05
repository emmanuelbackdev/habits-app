import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ChallengeTrack } from '@/components/challenge-banner';
import { PrimaryButton, ReminderPicker, Section, TargetStepper } from '@/components/habit-form';
import { Heatmap } from '@/components/heatmap';
import { StatTile } from '@/components/stat-tile';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { confirmDestructive } from '@/lib/confirm';
import { relativeDayLabel } from '@/lib/dates';
import { haptic, playSound } from '@/lib/feedback';
import {
  bestStreak,
  consistency,
  countOn,
  doneDays,
  habitStreak,
  isDone,
  nextChallengeLength,
  targetLabel,
} from '@/lib/habits';
import { useActiveChallenge, useHabits } from '@/lib/habits-store';
import { requestPermission } from '@/lib/notifications';

const PADDING = Spacing.four;

export default function HabitDetailScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { habits, challenges, updateHabit, deleteHabit, setDayCount, startChallenge } = useHabits();
  const current = useActiveChallenge();
  const [selected, setSelected] = useState<string | null>(null);
  const habit = habits.find((h) => h.id === id);

  if (!habit) return <ThemedView style={styles.container} />;

  const streak = habitStreak(habit);
  const month = consistency([habit], 30);
  const rate = month.total ? Math.round((month.done / month.total) * 100) : 0;
  const trophies = challenges.filter((c) => c.habitId === habit.id && c.status === 'won');
  const mine = current?.habit.id === habit.id && current.state === 'active' ? current : null;
  const nextDays = nextChallengeLength(challenges);

  const toggleSelected = () => {
    if (!selected) return;
    haptic.light();
    setDayCount(habit.id, selected, isDone(habit, selected) ? 0 : habit.target);
  };

  const remove = () =>
    confirmDestructive('Delete habit?', `"${habit.name}" and its history will be removed.`, 'Delete', () => {
      router.back();
      deleteHabit(habit.id);
    });

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: habit.name }} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <View style={[styles.emojiBadge, { backgroundColor: habit.color + '26' }]}>
            <ThemedText style={styles.emoji}>{habit.emoji}</ThemedText>
          </View>
          <View style={styles.flex}>
            <ThemedText type="smallBold">{habit.name}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {targetLabel(habit)}
              {trophies.length > 0 ? `  ·  🏆 ×${trophies.length}` : ''}
            </ThemedText>
          </View>
        </View>

        <View style={styles.tiles}>
          <StatTile value={`${streak}🔥`} label="Current streak" />
          <StatTile value={`${bestStreak(habit)}`} label="Best streak" />
          <StatTile value={`${rate}%`} label="Last 30 days" />
          <StatTile value={`${doneDays(habit).length}`} label="Days completed" />
        </View>

        <Section label="Consistency">
          <Heatmap habit={habit} selected={selected} onSelect={setSelected} horizontalPadding={PADDING * 2} />
          {selected && (
            <ThemedView type="backgroundElement" style={styles.selection}>
              <ThemedText type="small" style={styles.flex}>
                <ThemedText type="smallBold">{relativeDayLabel(selected)}</ThemedText>
                {'  ·  '}
                {habit.kind === 'count'
                  ? `${countOn(habit, selected)}/${habit.target} ${habit.unit || 'times'}`
                  : isDone(habit, selected)
                    ? 'Done'
                    : 'Not done'}
              </ThemedText>
              <Pressable onPress={toggleSelected} accessibilityRole="button" hitSlop={8}>
                <ThemedText type="smallBold" style={{ color: theme.tint }}>
                  {isDone(habit, selected) ? 'Clear' : 'Mark done'}
                </ThemedText>
              </Pressable>
            </ThemedView>
          )}
        </Section>

        <Section label="Challenge">
          {mine ? (
            <ThemedView type="backgroundElement" style={styles.card}>
              <ThemedText type="smallBold">
                🏆 Day {mine.dayNumber} of {mine.challenge.days}
              </ThemedText>
              <ChallengeTrack days={mine.days} color={habit.color} />
            </ThemedView>
          ) : (
            <View style={styles.stack}>
              <ThemedText type="small" themeColor="textSecondary">
                {current?.state === 'active'
                  ? `Starting one here replaces your current ${current.habit.emoji} challenge.`
                  : `Hit this ${nextDays} days in a row to earn a trophy.`}
              </ThemedText>
              <PrimaryButton
                title={`Start ${nextDays}-day challenge`}
                color={habit.color}
                onPress={() => {
                  haptic.success();
                  playSound('tap');
                  startChallenge(habit.id, nextDays);
                }}
              />
            </View>
          )}
        </Section>

        {habit.kind === 'count' && (
          <Section label="Daily goal">
            <TargetStepper
              target={habit.target}
              unit={habit.unit ?? ''}
              onTarget={(target) => updateHabit(habit.id, { target })}
              onUnit={(unit) => updateHabit(habit.id, { unit })}
              color={habit.color}
            />
          </Section>
        )}

        <Section label="Remind me">
          <ReminderPicker
            value={habit.reminder}
            onChange={(reminder) => {
              updateHabit(habit.id, { reminder });
              if (reminder) requestPermission();
            }}
            color={habit.color}
          />
        </Section>

        <Pressable onPress={remove} accessibilityRole="button" style={styles.delete}>
          <ThemedText type="smallBold" style={styles.deleteText}>
            Delete habit
          </ThemedText>
        </Pressable>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: PADDING, gap: Spacing.four, paddingBottom: Spacing.six },
  flex: { flex: 1 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  emojiBadge: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 30, lineHeight: 36 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  selection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: 14,
    gap: Spacing.two,
  },
  card: { gap: Spacing.two, padding: Spacing.three, borderRadius: 16, borderCurve: 'continuous' },
  stack: { gap: Spacing.two },
  delete: { alignItems: 'center', paddingVertical: Spacing.three },
  deleteText: { color: '#E5484D' },
});
