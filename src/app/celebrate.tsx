import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Confetti } from '@/components/confetti';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { haptic, playSound } from '@/lib/feedback';
import { habitStreak, ladderAfter } from '@/lib/habits';
import { useHabits } from '@/lib/habits-store';

/** Full-screen reward for finishing a challenge. Marks it celebrated when dismissed. */
export default function CelebrateScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { challenges, habits, markCelebrated, startChallenge } = useHabits();
  const [rain, setRain] = useState(1);
  const challenge = challenges.find((c) => c.id === id);
  const habit = habits.find((h) => h.id === challenge?.habitId);

  useEffect(() => {
    haptic.celebrate();
    playSound('fanfare');
  }, []);

  const close = (nextDays?: number) => {
    if (challenge) markCelebrated(challenge.id);
    if (habit && nextDays) startChallenge(habit.id, nextDays);
    router.back();
  };

  if (!challenge || !habit) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: '#208AEF' }]}>
        <Pressable onPress={() => close()} style={styles.secondary}>
          <ThemedText style={styles.light}>Close</ThemedText>
        </Pressable>
      </SafeAreaView>
    );
  }

  const next = ladderAfter(challenge.days);
  const wins = challenges.filter((c) => c.status === 'won').length;

  return (
    <View style={[styles.container, { backgroundColor: habit.color }]}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.body}>
          <Pressable
            onPress={() => {
              haptic.success();
              playSound('complete');
              setRain((r) => r + 1);
            }}
            accessibilityLabel="Trophy. Tap for more confetti">
            <Animated.View entering={ZoomIn.springify().damping(9)} style={styles.trophyCircle}>
              <ThemedText style={styles.trophy}>🏆</ThemedText>
            </Animated.View>
          </Pressable>
          <Animated.View entering={FadeInDown.delay(250).duration(500)} style={styles.text}>
            <ThemedText style={[styles.light, styles.kicker]}>CHALLENGE COMPLETE</ThemedText>
            <ThemedText type="subtitle" style={[styles.light, styles.center]}>
              {challenge.days} days. You did it.
            </ThemedText>
            <ThemedText style={[styles.light, styles.center, styles.soft]}>
              You showed up for {habit.emoji} {habit.name} {challenge.days} days straight. That’s how habits are built.
            </ThemedText>
          </Animated.View>
          <Animated.View entering={FadeInDown.delay(450).duration(500)} style={styles.stats}>
            <View style={styles.stat}>
              <ThemedText style={[styles.light, styles.statValue]}>{habitStreak(habit)}🔥</ThemedText>
              <ThemedText type="small" style={[styles.light, styles.soft]}>
                day streak
              </ThemedText>
            </View>
            <View style={styles.stat}>
              <ThemedText style={[styles.light, styles.statValue]}>{wins}🏆</ThemedText>
              <ThemedText type="small" style={[styles.light, styles.soft]}>
                {wins === 1 ? 'trophy' : 'trophies'}
              </ThemedText>
            </View>
          </Animated.View>
        </View>

        <Animated.View entering={FadeInDown.delay(650).duration(500)} style={styles.footer}>
          <Pressable
            onPress={() => close(next)}
            accessibilityRole="button"
            style={({ pressed }) => [styles.primary, pressed && styles.pressed]}>
            <ThemedText style={[styles.primaryText, { color: habit.color }]}>
              {next > challenge.days ? `Take on the ${next}-day challenge` : `Go again: ${next} days`}
            </ThemedText>
          </Pressable>
          <Pressable onPress={() => close()} accessibilityRole="button" style={styles.secondary}>
            <ThemedText type="smallBold" style={[styles.light, styles.soft]}>
              Back to today
            </ThemedText>
          </Pressable>
        </Animated.View>
      </SafeAreaView>
      <Confetti trigger={rain} mode="rain" colors={['#FFFFFF', '#FFD23F', '#FF8FB1', '#9EE6FF']} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1, padding: Spacing.four },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.four },
  trophyCircle: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trophy: { fontSize: 84, lineHeight: 100 },
  text: { alignItems: 'center', gap: Spacing.two },
  kicker: { fontSize: 13, lineHeight: 18, fontWeight: 800, letterSpacing: 2 },
  light: { color: '#fff' },
  soft: { opacity: 0.85 },
  center: { textAlign: 'center' },
  stats: { flexDirection: 'row', gap: Spacing.five },
  stat: { alignItems: 'center' },
  statValue: { fontSize: 28, lineHeight: 34, fontWeight: 800 },
  footer: { gap: Spacing.one },
  primary: { backgroundColor: '#fff', paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
  primaryText: { fontWeight: 800, fontSize: 17 },
  pressed: { opacity: 0.85 },
  secondary: { alignItems: 'center', paddingVertical: Spacing.three },
});
