/**
 * Habit domain model and pure helpers (no React, no storage).
 * The store in `habits-store.tsx` owns state; everything derivable lives here.
 */
import { addDays, currentStreak, dateKey, daysBetween, lastNDays, longestRun, parseKey } from '@/lib/dates';

/** `check`: done once per day. `count`: done when the day's count reaches `target`. */
export type HabitKind = 'check' | 'count';

export type ReminderTime = { hour: number; minute: number };

export type Habit = {
  id: string;
  name: string;
  emoji: string;
  color: string;
  createdAt: number;
  kind: HabitKind;
  /** Times per day needed to complete it. Always 1 for `check` habits. */
  target: number;
  /** Optional unit label for count habits, e.g. "glasses". */
  unit?: string;
  /** Day key (YYYY-MM-DD) → how many times it was logged that day. */
  log: Record<string, number>;
  /** Daily reminder time for this habit, or null for none. */
  reminder: ReminderTime | null;
};

export type ChallengeStatus = 'active' | 'won' | 'lost';

export type Challenge = {
  id: string;
  habitId: string;
  /** Length in days. */
  days: number;
  /** Day key of day 1. */
  startDay: string;
  status: ChallengeStatus;
  endedAt?: number;
  /** Whether the win celebration has been shown. */
  celebrated?: boolean;
};

export type Settings = {
  morningCheckIn: boolean;
  eveningNudge: boolean;
  sounds: boolean;
};

export const DEFAULT_SETTINGS: Settings = { morningCheckIn: true, eveningNudge: true, sounds: true };

/** Challenge ladder: first challenge is 3 days, each win unlocks the next rung. */
export const CHALLENGE_LADDER = [3, 7, 14, 30] as const;

export const HABIT_COLORS = ['#208AEF', '#30A46C', '#E5484D', '#F76B15', '#8E4EC6', '#D6409F'];
export const HABIT_EMOJIS = ['💧', '🏃', '📚', '🧘', '🥗', '😴', '✍️', '🎸', '🌱', '💊', '🦷', '📵'];

export const REMINDER_PRESETS: { label: string; time: ReminderTime }[] = [
  { label: 'Morning', time: { hour: 8, minute: 0 } },
  { label: 'Midday', time: { hour: 12, minute: 30 } },
  { label: 'Afternoon', time: { hour: 15, minute: 30 } },
  { label: 'Evening', time: { hour: 19, minute: 0 } },
  { label: 'Night', time: { hour: 21, minute: 30 } },
];

export function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function countOn(habit: Habit, day: string): number {
  return habit.log[day] ?? 0;
}

export function isDone(habit: Habit, day: string): boolean {
  return countOn(habit, day) >= habit.target;
}

/** 0…1 progress toward the target on `day`. */
export function progressOn(habit: Habit, day: string): number {
  return Math.min(1, countOn(habit, day) / habit.target);
}

export function habitStreak(habit: Habit): number {
  return currentStreak((key) => isDone(habit, key));
}

export function doneDays(habit: Habit): string[] {
  return Object.keys(habit.log).filter((k) => isDone(habit, k));
}

export function bestStreak(habit: Habit): number {
  return longestRun(doneDays(habit));
}

/** "8 glasses", "3 times", or "once" — how much a day takes. */
export function targetLabel(habit: Pick<Habit, 'kind' | 'target' | 'unit'>): string {
  if (habit.kind === 'check') return 'once a day';
  return `${habit.target} ${habit.unit?.trim() || 'times'} a day`;
}

/** Days in the last `window` days (including today) the habit existed and was done. */
export function consistency(habits: Habit[], window: number): { done: number; total: number } {
  let done = 0;
  let total = 0;
  for (const day of lastNDays(window)) {
    const key = dateKey(day);
    for (const h of habits) {
      if (key < dateKey(new Date(h.createdAt))) continue;
      total++;
      if (isDone(h, key)) done++;
    }
  }
  return { done, total };
}

/** Every habit that existed that day was done (and there was at least one). */
export function isPerfectDay(habits: Habit[], key: string): boolean {
  const existing = habits.filter((h) => key >= dateKey(new Date(h.createdAt)));
  return existing.length > 0 && existing.every((h) => isDone(h, key));
}

export type ChallengeDay = { key: string; done: boolean; isToday: boolean; isFuture: boolean };

export type ChallengeView = {
  challenge: Challenge;
  habit: Habit;
  /** 1-based day of the challenge that today falls on (clamped to its length). */
  dayNumber: number;
  days: ChallengeDay[];
  state: ChallengeStatus;
  doneToday: boolean;
};

/** Live view of a challenge. A stored win/loss is final; otherwise it's derived from the log. */
export function viewChallenge(challenge: Challenge, habit: Habit, today = dateKey()): ChallengeView {
  const start = parseKey(challenge.startDay);
  const days: ChallengeDay[] = Array.from({ length: challenge.days }, (_, i) => {
    const key = dateKey(addDays(start, i));
    return { key, done: isDone(habit, key), isToday: key === today, isFuture: key > today };
  });
  let state: ChallengeStatus = challenge.status;
  if (state === 'active') {
    if (days.every((d) => d.done)) state = 'won';
    else if (days.some((d) => !d.done && d.key < today)) state = 'lost';
  }
  const dayNumber = Math.min(challenge.days, Math.max(1, daysBetween(challenge.startDay, today) + 1));
  return { challenge, habit, dayNumber, days, state, doneToday: isDone(habit, today) };
}

export function nextChallengeLength(challenges: Challenge[]): number {
  const wins = challenges.filter((c) => c.status === 'won').length;
  return CHALLENGE_LADDER[Math.min(wins, CHALLENGE_LADDER.length - 1)];
}

/** The rung after `days` (stays at the top rung once reached). */
export function ladderAfter(days: number): number {
  const i = CHALLENGE_LADDER.findIndex((d) => d > days);
  return i === -1 ? CHALLENGE_LADDER[CHALLENGE_LADDER.length - 1] : CHALLENGE_LADDER[i];
}
