import { router } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { confirmDestructive } from '@/lib/confirm';
import { dateKey, formatTime, relativeDayLabel } from '@/lib/dates';
import { rigChallenge, rigMissedDay } from '@/lib/dev-tools';
import { haptic, playSound, type SoundName } from '@/lib/feedback';
import { CHALLENGE_LADDER } from '@/lib/habits';
import { EMPTY_STATE, useActiveChallenge, useHabits } from '@/lib/habits-store';
import { countScheduled, notificationsSupported, planNotifications, sendTestNotification } from '@/lib/notifications';

/** Which "jump to day" shortcuts to offer: every day for short challenges, the edges for long ones. */
function dayChoices(days: number): number[] {
  if (days <= 7) return Array.from({ length: days }, (_, i) => i + 1);
  return [1, 2, days - 2, days - 1, days];
}

/**
 * Developer tools for testing the challenge and reward flows. Rendered only in `__DEV__` builds.
 * Everything here edits real saved data.
 */
export function DevPanel() {
  const theme = useTheme();
  const { habits, challenges, settings, devApply } = useHabits();
  const current = useActiveChallenge();
  const [habitId, setHabitId] = useState<string | null>(current?.habit.id ?? habits[0]?.id ?? null);
  const [days, setDays] = useState<number>(current?.challenge.days ?? CHALLENGE_LADDER[0]);
  const [osCount, setOsCount] = useState<number | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const habit = habits.find((h) => h.id === habitId) ?? habits[0];
  const lastWin = challenges.findLast((c) => c.status === 'won');
  const upcoming = planNotifications({ habits, challenges, settings }).slice(0, 4);

  useEffect(() => {
    countScheduled().then(setOsCount);
  }, [habits, challenges, settings]);

  if (!habit) {
    return (
      <ThemedText type="small" themeColor="textSecondary">
        Add a habit to use the challenge tools.
      </ThemedText>
    );
  }

  const jumpTo = (day: number) => {
    haptic.step();
    devApply((s) => rigChallenge(s, { habitId: habit.id, days, day }));
    setNote(
      day === days
        ? `Final day set. Check in ${habit.emoji} ${habit.name} on Today to win it for real.`
        : `Day ${day} of ${days} set. Days 1–${day - 1} are marked done.`
    );
    router.navigate('/');
  };

  const winNow = () => {
    haptic.step();
    devApply((s) => rigChallenge(s, { habitId: habit.id, days, day: days, completeToday: true }));
    setNote('Challenge completed. The celebration should open by itself.');
  };

  const missDay = () => {
    haptic.step();
    devApply((s) => rigMissedDay(s, { habitId: habit.id, days }));
    setNote('Yesterday left undone, so the challenge is lost. Today shows the restart banner.');
    router.navigate('/');
  };

  const testNotification = async () => {
    const ok = await sendTestNotification(5);
    setNote(ok ? 'Test notification in 5 seconds. It shows even with the app open.' : 'Notification permission is off.');
    countScheduled().then(setOsCount);
  };

  const reset = () =>
    confirmDestructive('Reset all data?', 'Deletes every habit, challenge and setting, then restarts onboarding.', 'Reset', () =>
      devApply(() => EMPTY_STATE)
    );

  const status = current
    ? `${current.challenge.days}-day · ${current.habit.emoji} ${current.habit.name} · day ${current.dayNumber} · ${current.state}` +
      ` (started ${relativeDayLabel(current.challenge.startDay).toLowerCase()})`
    : 'No current challenge';

  return (
    <View style={styles.wrap}>
      <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.tint + '66' }]}>
        <ThemedText type="smallBold">🛠 Challenge</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {status}
        </ThemedText>

        <Row label="Habit">
          {habits.map((h) => (
            <Chip key={h.id} selected={h.id === habit.id} onPress={() => setHabitId(h.id)}>
              {h.emoji} {h.name}
            </Chip>
          ))}
        </Row>
        <Row label="Length">
          {CHALLENGE_LADDER.map((d) => (
            <Chip key={d} selected={d === days} onPress={() => setDays(d)}>
              {d} days
            </Chip>
          ))}
        </Row>
        <Row label="Jump to day">
          {dayChoices(days).map((d) => (
            <Chip key={d} onPress={() => jumpTo(d)} accent={d === days}>
              {d === days ? `Day ${d} (final)` : `Day ${d}`}
            </Chip>
          ))}
        </Row>
        <View style={styles.buttons}>
          <Chip onPress={winNow} accent>
            🏆 Win now
          </Chip>
          <Chip onPress={missDay}>Miss a day</Chip>
          {lastWin && (
            <Chip onPress={() => router.push({ pathname: '/celebrate', params: { id: lastWin.id } })}>
              Replay celebration
            </Chip>
          )}
        </View>
      </ThemedView>

      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText type="smallBold">🔔 Notifications</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {notificationsSupported
            ? `${osCount ?? '…'} pending with the OS. Next planned:`
            : 'Not supported on this platform. Planned (preview only):'}
        </ThemedText>
        {upcoming.map((n) => (
          <ThemedText key={n.date.getTime() + n.title} type="small" numberOfLines={1}>
            {relativeDayLabel(dateKey(n.date))} {formatTime(n.date.getHours(), n.date.getMinutes())} · {n.title}
          </ThemedText>
        ))}
        {notificationsSupported && (
          <View style={styles.buttons}>
            <Chip onPress={testNotification} accent>
              Send test in 5s
            </Chip>
          </View>
        )}
      </ThemedView>

      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText type="smallBold">🔊 Rewards</ThemedText>
        <View style={styles.buttons}>
          {(['tap', 'complete', 'fanfare'] as SoundName[]).map((s) => (
            <Chip
              key={s}
              onPress={() => {
                playSound(s);
                if (s === 'fanfare') haptic.celebrate();
                else if (s === 'complete') haptic.success();
                else haptic.step();
              }}>
              ▶ {s}
            </Chip>
          ))}
        </View>
      </ThemedView>

      {note && (
        <ThemedText type="small" style={{ color: theme.tint }} accessibilityLiveRegion="polite">
          {note}
        </ThemedText>
      )}

      <Pressable onPress={reset} accessibilityRole="button" style={styles.reset}>
        <ThemedText type="smallBold" style={styles.resetText}>
          Reset all data &amp; restart onboarding
        </ThemedText>
      </Pressable>
    </View>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.row}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <View style={styles.buttons}>{children}</View>
    </View>
  );
}

function Chip({
  children,
  onPress,
  selected,
  accent,
}: {
  children: ReactNode;
  onPress: () => void;
  selected?: boolean;
  accent?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.chip,
        { backgroundColor: theme.backgroundSelected },
        selected && { borderColor: theme.tint, backgroundColor: theme.tint + '26' },
        accent && { backgroundColor: theme.tint },
        pressed && styles.pressed,
      ]}>
      <ThemedText type="small" style={accent ? styles.accentText : undefined}>
        {children}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.two },
  card: { borderRadius: 16, padding: Spacing.three, gap: Spacing.two, borderWidth: 1, borderColor: 'transparent' },
  row: { gap: Spacing.one },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  accentText: { color: '#fff', fontWeight: 700 },
  pressed: { opacity: 0.7 },
  reset: { alignItems: 'center', paddingVertical: Spacing.three },
  resetText: { color: '#E5484D' },
});
