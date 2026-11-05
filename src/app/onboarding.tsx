import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChallengeTrack } from '@/components/challenge-banner';
import { KindPicker, PrimaryButton, ReminderPicker, Section, TargetStepper } from '@/components/habit-form';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { addDays, dateKey } from '@/lib/dates';
import { haptic, playSound } from '@/lib/feedback';
import { CHALLENGE_LADDER, HABIT_COLORS, type ReminderTime } from '@/lib/habits';
import { useHabits, type NewHabit } from '@/lib/habits-store';
import { notificationsSupported, requestPermission } from '@/lib/notifications';

const FIRST_CHALLENGE = CHALLENGE_LADDER[0];

type Draft = Omit<NewHabit, 'reminder'>;

const SUGGESTIONS: (Draft & { reminder: ReminderTime })[] = [
  { name: 'Drink water', emoji: '💧', color: HABIT_COLORS[0], kind: 'count', target: 8, unit: 'glasses', reminder: { hour: 12, minute: 30 } },
  { name: 'Move for 20 minutes', emoji: '🏃', color: HABIT_COLORS[1], kind: 'check', target: 1, reminder: { hour: 8, minute: 0 } },
  { name: 'Read 10 pages', emoji: '📚', color: HABIT_COLORS[4], kind: 'check', target: 1, reminder: { hour: 21, minute: 30 } },
  { name: 'Meditate', emoji: '🧘', color: HABIT_COLORS[5], kind: 'check', target: 1, reminder: { hour: 8, minute: 0 } },
  { name: 'Eat veggies', emoji: '🥗', color: HABIT_COLORS[3], kind: 'count', target: 3, unit: 'servings', reminder: { hour: 19, minute: 0 } },
  { name: 'Phone down by 10', emoji: '📵', color: HABIT_COLORS[2], kind: 'check', target: 1, reminder: { hour: 21, minute: 30 } },
];

export default function OnboardingScreen() {
  const theme = useTheme();
  const { addHabit, startChallenge, completeOnboarding } = useHabits();
  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState<number | 'custom'>(0);
  const [custom, setCustom] = useState<Draft>({ name: '', emoji: '🌱', color: HABIT_COLORS[0], kind: 'check', target: 4, unit: '' });
  const [reminder, setReminder] = useState<ReminderTime | null>(SUGGESTIONS[0].reminder);

  const habit: Draft = picked === 'custom' ? custom : SUGGESTIONS[picked];
  const canContinue = habit.name.trim().length > 0;

  const next = () => {
    haptic.step();
    setStep((s) => s + 1);
  };

  const finish = async (withReminders: boolean) => {
    if (withReminders) await requestPermission();
    const id = addHabit({
      ...habit,
      name: habit.name.trim(),
      unit: habit.unit?.trim() || undefined,
      target: habit.kind === 'check' ? 1 : habit.target,
      reminder,
    });
    startChallenge(id, FIRST_CHALLENGE);
    haptic.celebrate();
    playSound('fanfare');
    // Flipping this swaps the protected routes over to the main app.
    completeOnboarding();
  };

  const previewDays = Array.from({ length: FIRST_CHALLENGE }, (_, i) => ({
    key: dateKey(addDays(new Date(), i)),
    done: false,
    isToday: i === 0,
    isFuture: i > 0,
  }));

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.dots} accessibilityLabel={`Step ${step + 1} of 4`}>
          {[0, 1, 2, 3].map((i) => (
            <View
              key={i}
              style={[styles.dot, { backgroundColor: i <= step ? habit.color : theme.backgroundSelected }]}
            />
          ))}
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {step === 0 && (
            <Animated.View entering={FadeInDown.duration(500)} style={styles.step}>
              <ThemedText style={styles.hero}>🌱</ThemedText>
              <ThemedText type="subtitle">Small habits.{'\n'}Big wins.</ThemedText>
              <View style={styles.points}>
                <Point emoji="✨" title="Check in, get rewarded" detail="Every check-in comes with a little celebration." />
                <Point emoji="🏆" title="Take on challenges" detail={`Start with ${FIRST_CHALLENGE} days. Level up from there.`} />
                <Point emoji="🔔" title="We’ll keep you on track" detail="Friendly nudges at the times you choose." />
              </View>
            </Animated.View>
          )}

          {step === 1 && (
            <Animated.View entering={FadeInRight.duration(350)} style={styles.step}>
              <ThemedText type="subtitle">Pick your first habit</ThemedText>
              <ThemedText themeColor="textSecondary">Start small. You can add more anytime.</ThemedText>
              <View style={styles.suggestions}>
                {SUGGESTIONS.map((s, i) => (
                  <Pressable
                    key={s.name}
                    onPress={() => {
                      haptic.tick();
                      setPicked(i);
                      setReminder(s.reminder);
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: picked === i }}
                    style={[
                      styles.suggestion,
                      { backgroundColor: theme.backgroundElement },
                      picked === i && { borderColor: s.color, backgroundColor: s.color + '1F' },
                    ]}>
                    <ThemedText style={styles.suggestionEmoji}>{s.emoji}</ThemedText>
                    <View style={styles.flex}>
                      <ThemedText type="smallBold">{s.name}</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {s.kind === 'count' ? `${s.target} ${s.unit} a day` : 'Once a day'}
                      </ThemedText>
                    </View>
                  </Pressable>
                ))}
                <Pressable
                  onPress={() => {
                    haptic.tick();
                    setPicked('custom');
                    setReminder(null);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: picked === 'custom' }}
                  style={[
                    styles.suggestion,
                    { backgroundColor: theme.backgroundElement },
                    picked === 'custom' && { borderColor: custom.color, backgroundColor: custom.color + '1F' },
                  ]}>
                  <ThemedText style={styles.suggestionEmoji}>✏️</ThemedText>
                  <ThemedText type="smallBold">Something else</ThemedText>
                </Pressable>
              </View>

              {picked === 'custom' && (
                <View style={styles.customForm}>
                  <TextInput
                    value={custom.name}
                    onChangeText={(name) => setCustom((c) => ({ ...c, name }))}
                    placeholder="What do you want to do daily?"
                    placeholderTextColor={theme.textSecondary}
                    autoFocus
                    style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
                  />
                  <KindPicker kind={custom.kind} onChange={(kind) => setCustom((c) => ({ ...c, kind }))} color={custom.color} />
                  {custom.kind === 'count' && (
                    <TargetStepper
                      target={custom.target}
                      unit={custom.unit ?? ''}
                      onTarget={(target) => setCustom((c) => ({ ...c, target }))}
                      onUnit={(unit) => setCustom((c) => ({ ...c, unit }))}
                      color={custom.color}
                    />
                  )}
                </View>
              )}
            </Animated.View>
          )}

          {step === 2 && (
            <Animated.View entering={FadeInRight.duration(350)} style={styles.step}>
              <ThemedText style={styles.hero}>🏆</ThemedText>
              <ThemedText type="subtitle">Your first challenge</ThemedText>
              <ThemedText themeColor="textSecondary">
                {habit.emoji} {habit.name.trim()} for {FIRST_CHALLENGE} days in a row. Finish it to earn your first trophy
                and unlock the {CHALLENGE_LADDER[1]}-day challenge.
              </ThemedText>
              <ChallengeTrack days={previewDays} color={habit.color} />
              <Section label="When will you do it?">
                <ReminderPicker value={reminder} onChange={setReminder} color={habit.color} />
              </Section>
            </Animated.View>
          )}

          {step === 3 && (
            <Animated.View entering={FadeInRight.duration(350)} style={styles.step}>
              <ThemedText style={styles.hero}>🔔</ThemedText>
              <ThemedText type="subtitle">Let us knock on your door</ThemedText>
              <ThemedText themeColor="textSecondary">
                A morning check-in, {reminder ? 'a nudge at the time you picked, ' : ''}and an evening reminder if
                something’s still open. We go quiet once you’re done for the day.
              </ThemedText>
            </Animated.View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          {step === 0 && <PrimaryButton title="Let’s go" color={habit.color} onPress={next} />}
          {step === 1 && <PrimaryButton title="Continue" color={habit.color} disabled={!canContinue} onPress={next} />}
          {step === 2 && <PrimaryButton title={`Accept the ${FIRST_CHALLENGE}-day challenge`} color={habit.color} onPress={next} />}
          {step === 3 && (
            <>
              <PrimaryButton
                title={notificationsSupported ? 'Turn on reminders' : 'Start my challenge'}
                color={habit.color}
                onPress={() => finish(notificationsSupported)}
              />
              {notificationsSupported && (
                <Pressable onPress={() => finish(false)} accessibilityRole="button" style={styles.secondary}>
                  <ThemedText type="smallBold" themeColor="textSecondary">
                    Not now
                  </ThemedText>
                </Pressable>
              )}
            </>
          )}
          {step > 0 && (
            <Pressable onPress={() => setStep((s) => s - 1)} accessibilityRole="button" style={styles.secondary}>
              <ThemedText type="small" themeColor="textSecondary">
                Back
              </ThemedText>
            </Pressable>
          )}
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

function Point({ emoji, title, detail }: { emoji: string; title: string; detail: string }) {
  return (
    <View style={styles.point}>
      <ThemedText style={styles.pointEmoji}>{emoji}</ThemedText>
      <View style={styles.flex}>
        <ThemedText type="smallBold">{title}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {detail}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  flex: { flex: 1 },
  dots: { flexDirection: 'row', gap: Spacing.two, paddingHorizontal: Spacing.four, paddingTop: Spacing.three },
  dot: { flex: 1, height: 4, borderRadius: 2 },
  content: { padding: Spacing.four, paddingTop: Spacing.five, flexGrow: 1 },
  step: { gap: Spacing.three },
  hero: { fontSize: 64, lineHeight: 76 },
  points: { gap: Spacing.three, marginTop: Spacing.three },
  point: { flexDirection: 'row', gap: Spacing.three, alignItems: 'flex-start' },
  pointEmoji: { fontSize: 26, lineHeight: 32 },
  suggestions: { gap: Spacing.two },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    borderCurve: 'continuous',
  },
  suggestionEmoji: { fontSize: 26, lineHeight: 32 },
  customForm: { gap: Spacing.three },
  input: { fontSize: 17, paddingHorizontal: Spacing.three, paddingVertical: 14, borderRadius: 14 },
  footer: { padding: Spacing.four, paddingTop: Spacing.two, gap: Spacing.one },
  secondary: { alignItems: 'center', paddingVertical: Spacing.two },
});
