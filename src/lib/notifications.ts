/**
 * Retention hook: local notifications that check in with the user.
 *
 * Instead of fixed repeating triggers, we rebuild a rolling week of one-shot notifications
 * from live data whenever state changes or the app comes to the foreground. That lets today's
 * copy be specific ("2/8 glasses so far", "Day 2 of your challenge") and lets us skip nudges for
 * habits that are already done. Future days use generic copy that's refreshed on next open.
 */
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { router, type Href } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';

import { addDays, dateKey, daysBetween } from '@/lib/dates';
import { countOn, habitStreak, isDone, viewChallenge, type Challenge, type Habit, type Settings } from '@/lib/habits';
import { useHabits } from '@/lib/habits-store';

export const notificationsSupported = Platform.OS === 'ios' || Platform.OS === 'android';

const CHANNEL_ID = 'reminders';
const MORNING = { hour: 8, minute: 30 };
const EVENING = { hour: 20, minute: 0 };
const DAYS_AHEAD = 7;
/** iOS keeps at most 64 pending local notifications per app. */
const MAX_PENDING = 60;

if (notificationsSupported) {
  // The user is already looking at the app, so don't pop banners over it.
  Notifications.setNotificationHandler({
    // Dev test notifications are the exception, so they can be checked without leaving the app.
    handleNotification: async (n) => ({
      shouldShowBanner: n.request.content.data?.test === true,
      shouldShowList: true,
      shouldPlaySound: n.request.content.data?.test === true,
      shouldSetBadge: false,
    }),
  });
}

export type PermissionState = 'granted' | 'denied' | 'undetermined' | 'unsupported';

async function ensureChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Habit reminders',
    importance: AndroidImportance.DEFAULT,
  });
}

export async function getPermission(): Promise<PermissionState> {
  if (!notificationsSupported) return 'unsupported';
  try {
    const p = await Notifications.getPermissionsAsync();
    if (p.granted) return 'granted';
    return p.canAskAgain ? 'undetermined' : 'denied';
  } catch {
    return 'unsupported';
  }
}

/** Asks for permission if it hasn't been decided yet. Resolves to whether we can notify. */
export async function requestPermission(): Promise<boolean> {
  if (!notificationsSupported) return false;
  try {
    // Android 13+ won't show the prompt until a channel exists.
    await ensureChannel();
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;
    return (await Notifications.requestPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

type Planned = { date: Date; title: string; body: string };

type PlanInput = { habits: Habit[]; challenges: Challenge[]; settings: Settings };

function at(day: Date, { hour, minute }: { hour: number; minute: number }) {
  const d = new Date(day);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function names(habits: Habit[]): string {
  const parts = habits.map((h) => `${h.emoji} ${h.name}`);
  if (parts.length <= 1) return parts.join('');
  if (parts.length > 3) return `${parts.slice(0, 2).join(', ')} and ${parts.length - 2} more`;
  return `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}`;
}

/** Pure: what to schedule for the coming week, given current state. */
export function planNotifications({ habits, challenges, settings }: PlanInput, now = new Date()): Planned[] {
  if (habits.length === 0) return [];
  const todayKey = dateKey(now);
  const active = challenges.find((c) => c.status === 'active');
  const activeHabit = active && habits.find((h) => h.id === active.habitId);
  const view = active && activeHabit ? viewChallenge(active, activeHabit, todayKey) : null;
  const live = view?.state === 'active' ? view : null;
  const plan: Planned[] = [];

  for (let d = 0; d < DAYS_AHEAD; d++) {
    const day = addDays(now, d);
    const key = dateKey(day);
    const isToday = d === 0;
    // For today we know what's done; future days assume nothing is yet.
    const pending = habits.filter((h) => !(isToday && isDone(h, key)));
    if (pending.length === 0) continue;

    const challengeDay = live && !(isToday && live.doneToday) ? daysBetween(live.challenge.startDay, key) + 1 : 0;
    // Non-null only on days that fall inside a live challenge that still needs today's check-in.
    const ch = live && challengeDay >= 1 && challengeDay <= live.challenge.days ? live : null;

    if (settings.morningCheckIn) {
      plan.push(
        ch
          ? {
              date: at(day, MORNING),
              title: `🏆 Day ${challengeDay} of ${ch.challenge.days}: ${ch.habit.emoji} ${ch.habit.name}`,
              body:
                challengeDay === ch.challenge.days
                  ? `Final day! Check in today to win your ${ch.challenge.days}-day challenge.`
                  : 'Your challenge is alive. Ready to start today’s check-in?',
            }
          : {
              date: at(day, MORNING),
              title: 'Good morning ☀️',
              body:
                pending.length === 1
                  ? `${names(pending)} is on deck today. Ready when you are.`
                  : `${pending.length} habits lined up today: ${names(pending)}. Ready to start?`,
            }
      );
    }

    for (const h of pending) {
      if (!h.reminder) continue;
      const count = countOn(h, key);
      const streak = isToday ? habitStreak(h) : 0;
      let body =
        isToday && h.kind === 'count' && count > 0
          ? `${count}/${h.target} ${h.unit || 'so far'} — you set this time aside to finish it.`
          : 'You set this intention for now. Tap to check in.';
      if (streak > 0) body += ` Your ${streak}-day streak is counting on you 🔥`;
      plan.push({ date: at(day, h.reminder), title: `${h.emoji} ${h.name}`, body });
    }

    if (settings.eveningNudge) {
      const streakAtStake = isToday && pending.some((h) => habitStreak(h) > 0);
      plan.push({
        date: at(day, EVENING),
        title: streakAtStake || ch ? 'Don’t break the chain 🔥' : 'Still time today ⏳',
        body: ch
          ? `${ch.habit.emoji} ${ch.habit.name} is all that stands between you and day ${challengeDay} of your challenge.`
          : isToday
            ? `${names(pending)} ${pending.length === 1 ? 'is' : 'are'} still open. A quick check-in keeps your momentum.`
            : `Did you get to ${names(pending)} today? One tap keeps your streak alive.`,
      });
    }
  }

  const upcoming = plan
    .filter((p) => p.date.getTime() > now.getTime() + 60_000)
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, MAX_PENDING - 1);

  // Fires only if the app isn't opened for over a week (every open reschedules everything).
  upcoming.push({
    date: at(addDays(now, DAYS_AHEAD + 2), { hour: 18, minute: 0 }),
    title: 'Your habits miss you 🌱',
    body: 'It’s been a little while. One check-in today restarts your momentum.',
  });
  return upcoming;
}

let queue: Promise<void> = Promise.resolve();

/** Replaces every scheduled notification with a fresh plan. Calls are serialized. */
export function syncNotifications(input: PlanInput & { onboarded: boolean }) {
  queue = queue
    .then(async () => {
      if ((await getPermission()) !== 'granted') return;
      await ensureChannel();
      // Replace our plan, but leave a pending dev test notification alone.
      for (const req of await Notifications.getAllScheduledNotificationsAsync()) {
        if (req.content.data?.test !== true) await Notifications.cancelScheduledNotificationAsync(req.identifier);
      }
      if (!input.onboarded) return;
      for (const n of planNotifications(input)) {
        await Notifications.scheduleNotificationAsync({
          content: { title: n.title, body: n.body, sound: 'default', data: { url: '/' } },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: n.date, channelId: CHANNEL_ID },
        });
      }
    })
    .catch(() => {});
}

/** Developer tool: fires a notification in `seconds` (shown even while the app is open). */
export async function sendTestNotification(seconds = 5): Promise<boolean> {
  if (!(await requestPermission())) return false;
  await Notifications.scheduleNotificationAsync({
    content: { title: '🔔 Test reminder', body: 'Notifications are working.', sound: 'default', data: { url: '/', test: true } },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds, channelId: CHANNEL_ID },
  });
  return true;
}

/** Developer tool: how many notifications the OS currently has pending for this app. */
export async function countScheduled(): Promise<number> {
  if (!notificationsSupported) return 0;
  try {
    return (await Notifications.getAllScheduledNotificationsAsync()).length;
  } catch {
    return 0;
  }
}

/** Keeps scheduled notifications in sync with state; mount once near the root. */
export function useNotificationSync() {
  const { habits, challenges, settings, onboarded, loaded } = useHabits();
  const latest = useRef({ habits, challenges, settings, onboarded });

  useEffect(() => {
    latest.current = { habits, challenges, settings, onboarded };
    if (!loaded || !notificationsSupported) return;
    // Debounce bursts of taps into one reschedule.
    const t = setTimeout(() => syncNotifications(latest.current), 800);
    return () => clearTimeout(t);
  }, [habits, challenges, settings, onboarded, loaded]);

  useEffect(() => {
    if (!notificationsSupported) return;
    // Day rollovers and permission changes in Settings both show up as a return to the app.
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') syncNotifications(latest.current);
    });
    return () => sub.remove();
  }, []);
}

/** Opens the screen a tapped notification points at (cold start and while running). */
export function useNotificationRouting() {
  useEffect(() => {
    if (!notificationsSupported) return;
    const open = (n: Notifications.Notification) => {
      const url = n.request.content.data?.url;
      if (typeof url === 'string') router.navigate(url as Href);
      Notifications.clearLastNotificationResponse();
    };
    const last = Notifications.getLastNotificationResponse();
    if (last) open(last.notification);
    const sub = Notifications.addNotificationResponseReceivedListener((r) => open(r.notification));
    return () => sub.remove();
  }, []);
}
