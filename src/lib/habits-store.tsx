import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { dateKey } from '@/lib/dates';
import {
  DEFAULT_SETTINGS,
  uid,
  viewChallenge,
  type Challenge,
  type Habit,
  type Settings,
} from '@/lib/habits';

const STORAGE_KEY = 'habits:v2';
const LEGACY_KEY = 'habits:v1';

export type PersistedState = {
  onboarded: boolean;
  habits: Habit[];
  challenges: Challenge[];
  settings: Settings;
};

export const EMPTY_STATE: PersistedState = {
  onboarded: false,
  habits: [],
  challenges: [],
  settings: DEFAULT_SETTINGS,
};

type LegacyHabit = {
  id: string;
  name: string;
  emoji: string;
  color: string;
  completed: Record<string, true>;
  createdAt: number;
};

/** v1 stored a bare array of once-a-day habits with a `completed` set. */
function migrateV1(legacy: LegacyHabit[]): PersistedState {
  return {
    ...EMPTY_STATE,
    onboarded: true,
    habits: legacy.map((h) => ({
      id: h.id,
      name: h.name,
      emoji: h.emoji,
      color: h.color,
      createdAt: h.createdAt,
      kind: 'check',
      target: 1,
      log: Object.fromEntries(Object.keys(h.completed).map((k) => [k, 1])),
      reminder: null,
    })),
  };
}

async function loadState(): Promise<PersistedState> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (raw) {
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    return { ...EMPTY_STATE, ...parsed, settings: { ...DEFAULT_SETTINGS, ...parsed.settings } };
  }
  const legacy = await AsyncStorage.getItem(LEGACY_KEY);
  if (legacy) return migrateV1(JSON.parse(legacy) as LegacyHabit[]);
  return EMPTY_STATE;
}

/** Settle active challenges: record wins/losses and drop ones whose habit was deleted. */
function settleChallenges(state: PersistedState): PersistedState {
  let changed = false;
  const challenges = state.challenges.flatMap((c) => {
    if (c.status !== 'active') return [c];
    const habit = state.habits.find((h) => h.id === c.habitId);
    if (!habit) {
      changed = true;
      return [];
    }
    const { state: next } = viewChallenge(c, habit);
    if (next === 'active') return [c];
    changed = true;
    return [{ ...c, status: next, endedAt: Date.now(), celebrated: next === 'won' ? false : undefined }];
  });
  return changed ? { ...state, challenges } : state;
}

export type NewHabit = Pick<Habit, 'name' | 'emoji' | 'color' | 'kind' | 'target' | 'unit' | 'reminder'>;

type HabitsContextValue = PersistedState & {
  loaded: boolean;
  /** Creates a habit and returns its id. */
  addHabit: (input: NewHabit) => string;
  updateHabit: (id: string, patch: Partial<NewHabit>) => void;
  deleteHabit: (id: string) => void;
  /** Adds `delta` to a day's count, clamped to 0…target. */
  logHabit: (id: string, delta: number, day?: string) => void;
  setDayCount: (id: string, day: string, count: number) => void;
  /** Starts a challenge, replacing any active one. */
  startChallenge: (habitId: string, days: number) => void;
  markCelebrated: (challengeId: string) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  completeOnboarding: () => void;
  /** Developer tools only: apply an arbitrary state transform (still settles challenges). */
  devApply: (fn: (prev: PersistedState) => PersistedState) => void;
};

const HabitsContext = createContext<HabitsContextValue | null>(null);

export function HabitsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PersistedState>(EMPTY_STATE);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadState()
      .catch(() => EMPTY_STATE)
      .then((s) => setState(settleChallenges(s)))
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (loaded) {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {});
    }
  }, [state, loaded]);

  /** Every mutation goes through here so challenge outcomes are recorded as they happen. */
  const update = (fn: (prev: PersistedState) => PersistedState) =>
    setState((prev) => settleChallenges(fn(prev)));

  const mapHabit = (id: string, fn: (h: Habit) => Habit) =>
    update((prev) => ({ ...prev, habits: prev.habits.map((h) => (h.id === id ? fn(h) : h)) }));

  const withCount = (h: Habit, day: string, count: number): Habit => {
    const log = { ...h.log };
    const clamped = Math.max(0, Math.min(h.target, count));
    if (clamped === 0) delete log[day];
    else log[day] = clamped;
    return { ...h, log };
  };

  const value: HabitsContextValue = {
    ...state,
    loaded,
    addHabit: (input) => {
      const id = uid();
      const target = input.kind === 'check' ? 1 : Math.max(1, Math.round(input.target));
      update((prev) => ({
        ...prev,
        habits: [...prev.habits, { ...input, target, id, log: {}, createdAt: Date.now() }],
      }));
      return id;
    },
    updateHabit: (id, patch) => mapHabit(id, (h) => ({ ...h, ...patch })),
    deleteHabit: (id) => update((prev) => ({ ...prev, habits: prev.habits.filter((h) => h.id !== id) })),
    logHabit: (id, delta, day = dateKey()) => mapHabit(id, (h) => withCount(h, day, (h.log[day] ?? 0) + delta)),
    setDayCount: (id, day, count) => mapHabit(id, (h) => withCount(h, day, count)),
    startChallenge: (habitId, days) =>
      update((prev) => ({
        ...prev,
        challenges: [
          ...prev.challenges.filter((c) => c.status !== 'active'),
          { id: uid(), habitId, days, startDay: dateKey(), status: 'active' },
        ],
      })),
    markCelebrated: (challengeId) =>
      update((prev) => ({
        ...prev,
        challenges: prev.challenges.map((c) => (c.id === challengeId ? { ...c, celebrated: true } : c)),
      })),
    updateSettings: (patch) => update((prev) => ({ ...prev, settings: { ...prev.settings, ...patch } })),
    completeOnboarding: () => update((prev) => ({ ...prev, onboarded: true })),
    devApply: (fn) => update(fn),
  };

  return <HabitsContext.Provider value={value}>{children}</HabitsContext.Provider>;
}

export function useHabits() {
  const ctx = useContext(HabitsContext);
  if (!ctx) throw new Error('useHabits must be used inside <HabitsProvider>');
  return ctx;
}

/** The current challenge (active or just settled but not yet replaced), with its live view. */
export function useActiveChallenge() {
  const { challenges, habits } = useHabits();
  const latest = challenges.at(-1);
  if (!latest) return null;
  // A won challenge stays "current" only until it's celebrated; a lost one until it's restarted.
  if (latest.status === 'won' && latest.celebrated) return null;
  const habit = habits.find((h) => h.id === latest.habitId);
  return habit ? viewChallenge(latest, habit) : null;
}
