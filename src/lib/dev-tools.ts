/**
 * Developer-only state transforms for exercising the challenge flow without waiting real days.
 * Each one rewrites real data (backfilled log days, a fresh challenge) and then goes through the
 * store's normal `update()`, so wins/losses are settled and celebrated by the same code users hit.
 */
import { addDays, dateKey } from '@/lib/dates';
import { uid, type Habit } from '@/lib/habits';
import type { PersistedState } from '@/lib/habits-store';

function withLog(habit: Habit, keys: string[], todayDone: boolean, earliest: Date): Habit {
  const log = { ...habit.log };
  for (const k of keys) log[k] = habit.target;
  const today = dateKey();
  if (todayDone) log[today] = habit.target;
  else delete log[today];
  // Keep backfilled days inside the habit's lifetime so stats and the heatmap count them.
  return { ...habit, log, createdAt: Math.min(habit.createdAt, earliest.getTime()) };
}

/**
 * Starts a fresh `days`-long challenge on `habitId` positioned so today is day `day`:
 * days 1…day-1 are marked done, today is left open (or done when `completeToday`).
 * With `day === days` and `completeToday: false`, the next real check-in wins it.
 */
export function rigChallenge(
  state: PersistedState,
  { habitId, days, day, completeToday = false }: { habitId: string; days: number; day: number; completeToday?: boolean }
): PersistedState {
  const start = addDays(new Date(), -(day - 1));
  const earlier = Array.from({ length: day - 1 }, (_, i) => dateKey(addDays(start, i)));
  return {
    ...state,
    habits: state.habits.map((h) => (h.id === habitId ? withLog(h, earlier, completeToday, start) : h)),
    // A new id each time, so the root layout presents the celebration again for re-runs.
    challenges: [
      ...state.challenges.filter((c) => c.status !== 'active'),
      { id: uid(), habitId, days, startDay: dateKey(start), status: 'active' },
    ],
  };
}

/** A challenge that started yesterday with yesterday left undone, so it settles as lost. */
export function rigMissedDay(state: PersistedState, { habitId, days }: { habitId: string; days: number }): PersistedState {
  const yesterday = dateKey(addDays(new Date(), -1));
  return {
    ...state,
    habits: state.habits.map((h) => {
      if (h.id !== habitId) return h;
      const log = { ...h.log };
      delete log[yesterday];
      return { ...h, log, createdAt: Math.min(h.createdAt, addDays(new Date(), -1).getTime()) };
    }),
    challenges: [
      ...state.challenges.filter((c) => c.status !== 'active'),
      { id: uid(), habitId, days, startDay: yesterday, status: 'active' },
    ],
  };
}
