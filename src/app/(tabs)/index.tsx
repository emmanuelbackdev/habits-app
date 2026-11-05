import { Link } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { ChallengeBanner } from '@/components/challenge-banner';
import { Confetti } from '@/components/confetti';
import { HabitCard } from '@/components/habit-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { dateKey } from '@/lib/dates';
import { isDone } from '@/lib/habits';
import { useHabits } from '@/lib/habits-store';

export default function TodayScreen() {
  const theme = useTheme();
  const { habits } = useHabits();
  const [rain, setRain] = useState(0);
  const today = dateKey();
  const doneCount = habits.filter((h) => isDone(h, today)).length;
  const allDone = habits.length > 0 && doneCount === habits.length;

  return (
    <ThemedView style={styles.container}>
      <Tabs.Screen
        options={{
          headerRight: () => (
            <Link href="/new" asChild>
              <Pressable hitSlop={12} accessibilityLabel="Add habit">
                <ThemedText style={[styles.addButton, { color: theme.tint }]}>＋</ThemedText>
              </Pressable>
            </Link>
          ),
        }}
      />

      <FlatList
        data={habits}
        keyExtractor={(h) => h.id}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          habits.length > 0 ? (
            <View style={styles.header}>
              <View style={styles.summary}>
                <ThemedText type="small" themeColor="textSecondary">
                  {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                </ThemedText>
                <ThemedText type="subtitle">
                  {allDone ? 'Perfect day! 🎉' : `${doneCount} of ${habits.length} done`}
                </ThemedText>
                <ProgressBar progress={doneCount / habits.length} color={theme.success} />
              </View>
              <ChallengeBanner />
            </View>
          ) : undefined
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <ThemedText style={styles.emptyEmoji}>🌱</ThemedText>
            <ThemedText type="smallBold">No habits yet</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Tap ＋ to add your first one.
            </ThemedText>
          </View>
        }
        ListFooterComponent={
          habits.length > 0 ? (
            <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
              Tap the circle to log · hold it to undo · tap a habit for its history
            </ThemedText>
          ) : undefined
        }
        renderItem={({ item }) => <HabitCard habit={item} onPerfectDay={() => setRain((r) => r + 1)} />}
      />

      <Confetti trigger={rain} mode="rain" />
    </ThemedView>
  );
}

function ProgressBar({ progress, color }: { progress: number; color: string }) {
  const value = useSharedValue(progress);
  useEffect(() => {
    value.value = withSpring(progress, { damping: 18, stiffness: 120 });
  }, [progress, value]);
  const fill = useAnimatedStyle(() => ({ transform: [{ scaleX: value.value }] }));
  return (
    <ThemedView
      type="backgroundSelected"
      style={styles.progressTrack}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}>
      <Animated.View style={[styles.progressFill, { backgroundColor: color }, fill]} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: Spacing.three, gap: Spacing.three },
  header: { gap: Spacing.three, marginBottom: Spacing.one },
  addButton: { fontSize: 26, lineHeight: 30, paddingHorizontal: Spacing.three },
  summary: { gap: Spacing.two },
  progressTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', width: '100%', borderRadius: 4, transformOrigin: 'left' },
  empty: { alignItems: 'center', gap: Spacing.one, marginTop: Spacing.six },
  emptyEmoji: { fontSize: 48, lineHeight: 56 },
  hint: { textAlign: 'center', marginTop: Spacing.two },
});
