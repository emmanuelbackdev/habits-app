/** Local-date key in YYYY-MM-DD form (avoids UTC off-by-one issues from toISOString). */
export function dateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Inverse of `dateKey`: local midnight of that day. */
export function parseKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

export function daysAgo(n: number, from: Date = new Date()): Date {
  return addDays(from, -n);
}

/** Whole calendar days from `a` to `b` (keys). DST-safe because it rounds. */
export function daysBetween(a: string, b: string): number {
  return Math.round((parseKey(b).getTime() - parseKey(a).getTime()) / 86_400_000);
}

/** The last `count` days, oldest first, ending today. */
export function lastNDays(count: number): Date[] {
  return Array.from({ length: count }, (_, i) => daysAgo(count - 1 - i));
}

/**
 * Consecutive days for which `isDone(key)` holds, counting back from today.
 * If today isn't done yet, the streak still counts from yesterday.
 */
export function currentStreak(isDone: (key: string) => boolean): number {
  let streak = 0;
  let offset = isDone(dateKey()) ? 0 : 1;
  while (isDone(dateKey(daysAgo(offset)))) {
    streak++;
    offset++;
  }
  return streak;
}

/** Longest run of consecutive day keys in a set. */
export function longestRun(keys: string[]): number {
  const sorted = [...keys].sort();
  let best = 0;
  let run = 0;
  for (let i = 0; i < sorted.length; i++) {
    run = i > 0 && daysBetween(sorted[i - 1], sorted[i]) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
  }
  return best;
}

export function weekdayInitial(date: Date): string {
  return ['S', 'M', 'T', 'W', 'T', 'F', 'S'][date.getDay()];
}

export function formatTime(hour: number, minute: number): string {
  return new Date(2000, 0, 1, hour, minute).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** "Today", "Yesterday", or e.g. "Mon, Nov 3". */
export function relativeDayLabel(key: string): string {
  const diff = daysBetween(key, dateKey());
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return parseKey(key).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}
