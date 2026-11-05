import { AccessibilityInfo } from 'react-native';

import { dateKey } from '@/lib/dates';
import { haptic, playSound } from '@/lib/feedback';
import { countOn, habitStreak, isDone, type Habit } from '@/lib/habits';
import { useHabits } from '@/lib/habits-store';

/**
 * What a check-in achieved, from smallest to biggest reward:
 * `progress` one step of a count habit · `complete` habit done for today ·
 * `perfect` that completion finished every habit today.
 */
export type CheckInResult = 'none' | 'undo' | 'progress' | 'complete' | 'perfect';

/**
 * Logs today's check-in and fires the matching sound + haptic.
 * The caller uses the result for visuals (confetti, bounce).
 */
export function useCheckIn() {
  const { habits, logHabit } = useHabits();

  return (habit: Habit, delta: 1 | -1): CheckInResult => {
    const today = dateKey();
    const before = countOn(habit, today);
    const after = Math.max(0, Math.min(habit.target, before + delta));

    if (after === before) {
      haptic.tick();
      return 'none';
    }
    logHabit(habit.id, delta, today);

    if (after < before) {
      haptic.light();
      return 'undo';
    }
    if (after < habit.target) {
      haptic.step();
      playSound('tap');
      return 'progress';
    }

    const streak = habitStreak({ ...habit, log: { ...habit.log, [today]: after } });
    const perfect = habits.length > 1 && habits.every((h) => h.id === habit.id || isDone(h, today));
    if (perfect) {
      haptic.celebrate();
      playSound('fanfare');
      AccessibilityInfo.announceForAccessibility(`${habit.name} done. Perfect day, every habit complete!`);
      return 'perfect';
    }
    haptic.success();
    playSound('complete');
    AccessibilityInfo.announceForAccessibility(`${habit.name} done. ${streak} day streak.`);
    return 'complete';
  };
}
