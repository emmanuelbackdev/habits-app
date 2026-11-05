import { Link, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { AppState, Linking, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';

import { DevPanel } from '@/components/dev-panel';
import { Section } from '@/components/habit-form';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatTime } from '@/lib/dates';
import { haptic } from '@/lib/feedback';
import { targetLabel, type Settings } from '@/lib/habits';
import { useHabits } from '@/lib/habits-store';
import { getPermission, notificationsSupported, requestPermission, type PermissionState } from '@/lib/notifications';

export default function ManageScreen() {
  const theme = useTheme();
  const { habits, settings, updateSettings } = useHabits();
  const [permission, setPermission] = useState<PermissionState>('undetermined');

  useEffect(() => {
    const refresh = () => getPermission().then(setPermission);
    refresh();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && refresh());
    return () => sub.remove();
  }, []);

  const toggle = async (key: keyof Settings, value: boolean) => {
    haptic.tick();
    updateSettings({ [key]: value });
    if (value && key !== 'sounds' && permission !== 'granted') {
      await requestPermission();
      setPermission(await getPermission());
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        <Section label="Habits">
          <ThemedView type="backgroundElement" style={styles.group}>
            {habits.map((h, i) => (
              <Pressable
                key={h.id}
                onPress={() => router.push({ pathname: '/habit/[id]', params: { id: h.id } })}
                accessibilityRole="button"
                accessibilityHint="Opens history, goal, reminder and delete"
                style={({ pressed }) => [
                  styles.habitRow,
                  i > 0 && { borderTopColor: theme.backgroundSelected, borderTopWidth: StyleSheet.hairlineWidth },
                  pressed && styles.pressed,
                ]}>
                <View style={[styles.emojiBadge, { backgroundColor: h.color + '26' }]}>
                  <ThemedText style={styles.emoji}>{h.emoji}</ThemedText>
                </View>
                <View style={styles.flex}>
                  <ThemedText numberOfLines={1}>{h.name}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                    {targetLabel(h)}
                    {h.reminder ? `  ·  🔔 ${formatTime(h.reminder.hour, h.reminder.minute)}` : ''}
                  </ThemedText>
                </View>
                <ThemedText themeColor="textSecondary">›</ThemedText>
              </Pressable>
            ))}
            <Link href="/new" asChild>
              <Pressable
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.habitRow,
                  habits.length > 0 && { borderTopColor: theme.backgroundSelected, borderTopWidth: StyleSheet.hairlineWidth },
                  pressed && styles.pressed,
                ]}>
                <View style={[styles.emojiBadge, { backgroundColor: theme.tint + '1F' }]}>
                  <ThemedText style={[styles.plus, { color: theme.tint }]}>＋</ThemedText>
                </View>
                <ThemedText style={{ color: theme.tint }}>New habit</ThemedText>
              </Pressable>
            </Link>
          </ThemedView>
        </Section>

        <Section label="Reminders & sound">
          <ThemedView type="backgroundElement" style={styles.group}>
            {notificationsSupported && (
              <>
                <SettingRow
                  title="Morning check-in"
                  detail="8:30 AM · what’s on deck today"
                  value={settings.morningCheckIn}
                  onChange={(v) => toggle('morningCheckIn', v)}
                />
                <SettingRow
                  title="Evening nudge"
                  detail="8:00 PM · only if something’s still open"
                  value={settings.eveningNudge}
                  onChange={(v) => toggle('eveningNudge', v)}
                />
              </>
            )}
            <SettingRow
              title="Sounds"
              detail="Chimes when you check in"
              value={settings.sounds}
              onChange={(v) => toggle('sounds', v)}
            />
          </ThemedView>
          {permission === 'denied' && (
            <Pressable onPress={() => Linking.openSettings()} accessibilityRole="button">
              <ThemedText type="small" themeColor="textSecondary">
                Notifications are turned off for this app.{' '}
                <ThemedText type="smallBold" style={{ color: theme.tint }}>
                  Open Settings
                </ThemedText>
              </ThemedText>
            </Pressable>
          )}
          {!notificationsSupported && (
            <ThemedText type="small" themeColor="textSecondary">
              Reminders are available in the iOS and Android apps.
            </ThemedText>
          )}
        </Section>

        {__DEV__ && (
          <Section label="Developer (dev builds only)">
            <DevPanel />
          </Section>
        )}
      </ScrollView>
    </ThemedView>
  );
}

function SettingRow({
  title,
  detail,
  value,
  onChange,
}: {
  title: string;
  detail: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  const theme = useTheme();
  return (
    <View style={styles.settingRow}>
      <View style={styles.flex}>
        <ThemedText type="smallBold">{title}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {detail}
        </ThemedText>
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: theme.success }} accessibilityLabel={title} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.four, gap: Spacing.four, paddingBottom: Spacing.six },
  flex: { flex: 1 },
  group: { borderRadius: 16, paddingHorizontal: Spacing.three, borderCurve: 'continuous' },
  habitRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.three },
  emojiBadge: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 20, lineHeight: 26 },
  plus: { fontSize: 20, lineHeight: 24, fontWeight: 700 },
  pressed: { opacity: 0.6 },
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.three },
});
