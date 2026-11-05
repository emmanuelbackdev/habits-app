import type { ReactNode } from 'react';
import { Pressable, StyleSheet, TextInput, View, type PressableProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatTime } from '@/lib/dates';
import { haptic } from '@/lib/feedback';
import { REMINDER_PRESETS, type HabitKind, type ReminderTime } from '@/lib/habits';

export function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <ThemedText type="smallBold" themeColor="textSecondary">
        {label.toUpperCase()}
      </ThemedText>
      {children}
    </View>
  );
}

function Option({
  selected,
  color,
  children,
  ...rest
}: PressableProps & { selected: boolean; color: string; children: ReactNode }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      {...rest}
      style={({ pressed }) => [
        styles.option,
        { backgroundColor: theme.backgroundElement },
        selected && { borderColor: color, backgroundColor: color + '1F' },
        pressed && styles.pressed,
      ]}>
      {children}
    </Pressable>
  );
}

export function KindPicker({
  kind,
  onChange,
  color,
}: {
  kind: HabitKind;
  onChange: (kind: HabitKind) => void;
  color: string;
}) {
  const options: { kind: HabitKind; title: string; detail: string }[] = [
    { kind: 'check', title: '✓  Once a day', detail: 'Check it off when it’s done' },
    { kind: 'count', title: '＋  Several times', detail: 'Count up to a daily goal' },
  ];
  return (
    <View style={styles.row}>
      {options.map((o) => (
        <Option
          key={o.kind}
          selected={kind === o.kind}
          color={color}
          onPress={() => {
            haptic.tick();
            onChange(o.kind);
          }}>
          <ThemedText type="smallBold">{o.title}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {o.detail}
          </ThemedText>
        </Option>
      ))}
    </View>
  );
}

export function TargetStepper({
  target,
  unit,
  onTarget,
  onUnit,
  color,
}: {
  target: number;
  unit: string;
  onTarget: (n: number) => void;
  onUnit: (u: string) => void;
  color: string;
}) {
  const theme = useTheme();
  const step = (d: number) => {
    const next = Math.max(2, Math.min(20, target + d));
    if (next !== target) haptic.tick();
    onTarget(next);
  };
  return (
    <View style={styles.stepperRow}>
      <Pressable
        onPress={() => step(-1)}
        accessibilityLabel="Decrease daily goal"
        style={[styles.stepButton, { backgroundColor: theme.backgroundElement }]}>
        <ThemedText type="subtitle" style={styles.stepGlyph}>
          −
        </ThemedText>
      </Pressable>
      <ThemedText type="subtitle" style={[styles.targetValue, { color }]} accessibilityLabel={`Goal ${target}`}>
        {target}
      </ThemedText>
      <Pressable
        onPress={() => step(1)}
        accessibilityLabel="Increase daily goal"
        style={[styles.stepButton, { backgroundColor: theme.backgroundElement }]}>
        <ThemedText type="subtitle" style={styles.stepGlyph}>
          ＋
        </ThemedText>
      </Pressable>
      <TextInput
        value={unit}
        onChangeText={onUnit}
        placeholder="times"
        placeholderTextColor={theme.textSecondary}
        maxLength={16}
        accessibilityLabel="Unit, for example glasses or pages"
        style={[styles.unitInput, { color: theme.text, backgroundColor: theme.backgroundElement }]}
      />
      <ThemedText type="small" themeColor="textSecondary">
        a day
      </ThemedText>
    </View>
  );
}

export function ReminderPicker({
  value,
  onChange,
  color,
}: {
  value: ReminderTime | null;
  onChange: (t: ReminderTime | null) => void;
  color: string;
}) {
  const same = (t: ReminderTime) => value?.hour === t.hour && value?.minute === t.minute;
  return (
    <View style={styles.wrap}>
      <Option
        selected={value === null}
        color={color}
        onPress={() => {
          haptic.tick();
          onChange(null);
        }}>
        <ThemedText type="smallBold">Off</ThemedText>
      </Option>
      {REMINDER_PRESETS.map((p) => (
        <Option
          key={p.label}
          selected={same(p.time)}
          color={color}
          onPress={() => {
            haptic.tick();
            onChange(p.time);
          }}>
          <ThemedText type="smallBold">{p.label}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {formatTime(p.time.hour, p.time.minute)}
          </ThemedText>
        </Option>
      ))}
    </View>
  );
}

export function PrimaryButton({
  title,
  color,
  disabled,
  onPress,
}: {
  title: string;
  color: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.primary,
        { backgroundColor: color, opacity: disabled ? 0.4 : pressed ? 0.8 : 1 },
      ]}>
      <ThemedText style={styles.primaryText}>{title}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: { gap: Spacing.two },
  row: { flexDirection: 'row', gap: Spacing.two },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  option: {
    flexGrow: 1,
    flexBasis: 0,
    minWidth: 96,
    padding: Spacing.three,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
    gap: Spacing.half,
    borderCurve: 'continuous',
  },
  pressed: { opacity: 0.7 },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  stepButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  stepGlyph: { fontSize: 22, lineHeight: 26 },
  targetValue: { minWidth: 40, textAlign: 'center', fontVariant: ['tabular-nums'] },
  unitInput: {
    flex: 1,
    fontSize: 16,
    paddingHorizontal: Spacing.three,
    paddingVertical: 10,
    borderRadius: 12,
  },
  primary: { paddingVertical: 16, borderRadius: 16, alignItems: 'center', borderCurve: 'continuous' },
  primaryText: { color: '#fff', fontWeight: 700, fontSize: 17 },
});
