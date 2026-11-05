import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { relativeDayLabel } from '@/lib/dates';
import { haptic, playSound } from '@/lib/feedback';
import { nextChallengeLength, type ChallengeDay } from '@/lib/habits';
import { useActiveChallenge, useHabits } from '@/lib/habits-store';

/** Day-by-day progress bar for a challenge. */
export function ChallengeTrack({ days, color }: { days: ChallengeDay[]; color: string }) {
  const theme = useTheme();
  const compact = days.length > 7;
  return (
    <View style={[styles.track, compact && styles.trackCompact]}>
      {days.map((d, i) => (
        <View
          key={d.key}
          style={[
            styles.segment,
            compact ? styles.segmentCompact : styles.segmentLarge,
            { backgroundColor: d.done ? color : theme.backgroundSelected },
            d.isToday && !d.done && { borderWidth: 2, borderColor: color },
          ]}>
          {!compact && (
            <ThemedText type="smallBold" style={d.done ? styles.segmentTextDone : undefined} themeColor="textSecondary">
              {d.done ? '✓' : i + 1}
            </ThemedText>
          )}
        </View>
      ))}
    </View>
  );
}

export function ChallengeBanner() {
  const theme = useTheme();
  const { habits, challenges, startChallenge } = useHabits();
  const view = useActiveChallenge();

  const start = (habitId: string, days: number) => {
    haptic.success();
    playSound('tap');
    startChallenge(habitId, days);
  };

  if (habits.length === 0) return null;

  if (!view) {
    const days = nextChallengeLength(challenges);
    return (
      <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.tint + '55' }]}>
        <ThemedText type="smallBold">🏆 Ready for a {days}-day challenge?</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Pick a habit and hit it {days} days in a row to earn a trophy.
        </ThemedText>
        <View style={styles.chips}>
          {habits.map((h) => (
            <Pressable
              key={h.id}
              onPress={() => start(h.id, days)}
              accessibilityRole="button"
              accessibilityLabel={`Start a ${days}-day challenge for ${h.name}`}
              style={({ pressed }) => [styles.chip, { backgroundColor: h.color + '26' }, pressed && styles.pressed]}>
              <ThemedText type="small">
                {h.emoji} {h.name}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      </ThemedView>
    );
  }

  const { challenge, habit, days, dayNumber, state, doneToday } = view;

  if (state === 'won') {
    return (
      <Pressable
        onPress={() => router.push({ pathname: '/celebrate', params: { id: challenge.id } })}
        accessibilityRole="button">
        <ThemedView type="backgroundElement" style={[styles.card, { borderColor: habit.color }]}>
          <ThemedText type="smallBold">🎉 {challenge.days}-day challenge complete!</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Tap to claim your trophy.
          </ThemedText>
        </ThemedView>
      </Pressable>
    );
  }

  if (state === 'lost') {
    const missed = days.find((d) => !d.done && !d.isFuture && !d.isToday);
    return (
      <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.backgroundSelected }]}>
        <ThemedText type="smallBold">
          {habit.emoji} Challenge missed{missed ? ` on ${relativeDayLabel(missed.key)}` : ''}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Every great streak starts with a restart. Day 1 is today.
        </ThemedText>
        <Pressable
          onPress={() => start(habit.id, challenge.days)}
          accessibilityRole="button"
          style={({ pressed }) => [styles.button, { backgroundColor: habit.color }, pressed && styles.pressed]}>
          <ThemedText type="smallBold" style={styles.buttonText}>
            Restart {challenge.days}-day challenge
          </ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  return (
    <ThemedView type="backgroundElement" style={[styles.card, { borderColor: habit.color + '88' }]}>
      <View style={styles.header}>
        <ThemedText type="smallBold">🏆 {challenge.days}-Day Challenge</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Day {dayNumber} of {challenge.days}
        </ThemedText>
      </View>
      <ChallengeTrack days={days} color={habit.color} />
      <ThemedText type="small" themeColor="textSecondary">
        {habit.emoji} {habit.name} ·{' '}
        {doneToday
          ? dayNumber === challenge.days
            ? 'Done!'
            : 'Today’s done ✓ See you tomorrow.'
          : dayNumber === challenge.days
            ? 'Final day: check in to win!'
            : 'Check in today to keep it alive.'}
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1.5,
    borderCurve: 'continuous',
    padding: Spacing.three,
    gap: Spacing.two,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  track: { flexDirection: 'row', gap: Spacing.two },
  trackCompact: { gap: 3 },
  segment: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  segmentLarge: { height: 34, borderRadius: 10 },
  segmentCompact: { height: 10, borderRadius: 5 },
  segmentTextDone: { color: '#fff' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderRadius: 999 },
  button: { paddingVertical: 12, borderRadius: 14, alignItems: 'center', marginTop: Spacing.one },
  buttonText: { color: '#fff' },
  pressed: { opacity: 0.7 },
});
