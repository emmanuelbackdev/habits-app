import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { KindPicker, PrimaryButton, ReminderPicker, Section, TargetStepper } from '@/components/habit-form';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { haptic, playSound } from '@/lib/feedback';
import { HABIT_COLORS, HABIT_EMOJIS, type HabitKind, type ReminderTime } from '@/lib/habits';
import { useHabits } from '@/lib/habits-store';
import { requestPermission } from '@/lib/notifications';

export default function NewHabitScreen() {
  const theme = useTheme();
  const { addHabit } = useHabits();
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState(HABIT_EMOJIS[0]);
  const [color, setColor] = useState(HABIT_COLORS[0]);
  const [kind, setKind] = useState<HabitKind>('check');
  const [target, setTarget] = useState(4);
  const [unit, setUnit] = useState('');
  const [reminder, setReminder] = useState<ReminderTime | null>(null);
  const canSave = name.trim().length > 0;

  const save = () => {
    if (!canSave) return;
    addHabit({ name: name.trim(), emoji, color, kind, target, unit: unit.trim() || undefined, reminder });
    // Creating a habit is part of the core loop too, so it gets its own small reward.
    haptic.success();
    playSound('complete');
    if (reminder) requestPermission();
    router.back();
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Section label="Name">
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Meditate for 10 minutes"
            placeholderTextColor={theme.textSecondary}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={save}
            style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
          />
        </Section>

        <Section label="Type">
          <KindPicker kind={kind} onChange={setKind} color={color} />
          {kind === 'count' && (
            <TargetStepper target={target} unit={unit} onTarget={setTarget} onUnit={setUnit} color={color} />
          )}
        </Section>

        <Section label="Remind me">
          <ReminderPicker value={reminder} onChange={setReminder} color={color} />
        </Section>

        <Section label="Icon">
          <View style={styles.grid}>
            {HABIT_EMOJIS.map((e) => (
              <Pressable
                key={e}
                onPress={() => setEmoji(e)}
                accessibilityLabel={`Icon ${e}`}
                accessibilityState={{ selected: e === emoji }}
                style={[
                  styles.emojiOption,
                  { backgroundColor: theme.backgroundElement },
                  e === emoji && { borderColor: color, backgroundColor: color + '26' },
                ]}>
                <ThemedText style={styles.emoji}>{e}</ThemedText>
              </Pressable>
            ))}
          </View>
        </Section>

        <Section label="Color">
          <View style={styles.grid}>
            {HABIT_COLORS.map((c) => (
              <Pressable
                key={c}
                onPress={() => setColor(c)}
                accessibilityLabel={`Color ${c}`}
                accessibilityState={{ selected: c === color }}
                style={[styles.colorOption, { backgroundColor: c }, c === color && styles.colorSelected]}
              />
            ))}
          </View>
        </Section>

        <PrimaryButton title="Add Habit" color={color} disabled={!canSave} onPress={save} />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.four, gap: Spacing.four, paddingBottom: Spacing.six },
  input: {
    fontSize: 17,
    paddingHorizontal: Spacing.three,
    paddingVertical: 14,
    borderRadius: 14,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  emojiOption: {
    width: 52,
    height: 52,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 26, lineHeight: 32 },
  colorOption: { width: 40, height: 40, borderRadius: 20 },
  colorSelected: { borderWidth: 4, borderColor: 'rgba(255,255,255,0.85)', transform: [{ scale: 1.1 }] },
});
