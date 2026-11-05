# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

"Habits" — a small habit tracker built with Expo SDK 58 (React Native 0.88, React 19.3, Expo Router, TypeScript strict). Package manager is **npm** (`package-lock.json`; no `bun.lock`), so use `npx`, not `bunx`.

## Commands

```bash
npm start                  # expo start (also: npm run ios | android | web)
npm run lint               # expo lint (flat config in eslint.config.js, eslint-config-expo)
npx tsc --noEmit           # typecheck
npx expo install <pkg>     # add deps — never plain npm install <pkg>
```

There is no test runner configured. To check that every route and asset actually bundles, run `npx expo export --platform ios --output-dir <tmp dir>` (or `--platform android`). The dev server lazy-loads routes, so loading its entry bundle doesn't catch a broken screen. Typed routes live in `.expo/types/router.d.ts` and are regenerated only while `expo start` runs, so after adding or renaming a route `tsc` may complain until the dev server has been started. Restart the dev server after editing `app.json`.

Don't run `npm run reset-project`: it deletes or moves all of `src/` and `scripts/` and would wipe the app. The README is the unchanged create-expo-app template.

## Architecture

- **Product frame**: core function = create + track habits; core loop = every check-in is rewarded (visuals + haptics + sound); accessory = history log, consistency charts, `check` vs `count` habits; surface area = 5–7 routes (currently 7, so it's at the cap); retention = challenges + local push check-ins. Put new features inside existing screens rather than adding routes.
- **Routing** (`src/app/`): root `Stack` in `_layout.tsx` uses `Stack.Protected` on `onboarded`. Before setup it shows `onboarding`. After setup it shows the `(tabs)` group (JS tabs from `expo-router/js-tabs`, icons via `SymbolView`: SF Symbols on iOS, Material on Android/web), which holds `index` (Today), `history` (consistency chart, trophies, full log) and `manage` (habit list, reminder/sound settings, dev panel). Stack screens above the tabs are `new` (modal), `habit/[id]` (detail: heatmap, stats, challenge, goal, reminder, delete) and `celebrate` (full-screen challenge win). That is 7 routes, the product's cap. The splash stays up until the store loads, and the layout pushes `/celebrate` once per won-but-uncelebrated challenge id. Tab screens set header options with `<Tabs.Screen options>` (from `expo-router/js-tabs`; the `Tabs` export from `expo-router` is deprecated), and stack screens with `<Stack.Screen options>`. `typedRoutes` and `reactCompiler` are on, so manual `useMemo`/`useCallback` are usually unnecessary.
- **Dev panel** (`src/components/dev-panel.tsx`, shown only under `__DEV__` at the bottom of Manage): jump a challenge to day N, win now, miss a day, replay the celebration, send a 5s test notification (shown even in the foreground, and never cancelled by a sync), preview the notification plan, play the reward sounds, and reset to onboarding. Its state rigs are pure functions in `src/lib/dev-tools.ts` that go through `devApply` → `update()`, so wins and losses settle through the real path. They edit real saved data.
- **Model** (`src/lib/habits.ts`, pure): `Habit.kind` is `'check'` (target 1) or `'count'` (done when `log[day] >= target`). `Habit.log` is `Record<'YYYY-MM-DD', number>`. `Challenge` has a `habitId`, a length from `CHALLENGE_LADDER` (3→7→14→30) and a `startDay`. `viewChallenge()` derives `active`/`won`/`lost` from the log, and a stored win/loss is final. Put derivable logic here, not in components.
- **State** (`src/lib/habits-store.tsx`): `HabitsProvider` / `useHabits` holds `{ onboarded, habits, challenges, settings }`, persisted as one JSON blob under `habits:v2`. Old `habits:v1` arrays are migrated on load (and the v1 key is left in place). Every mutation goes through `update()`, which runs `settleChallenges` so wins and losses are recorded as they happen. Writes happen only after `loaded`. If you change a persisted shape, bump the key or extend the migration.
- **Reward loop**: `useCheckIn()` (`src/lib/use-check-in.ts`) logs today and fires sound + haptics, returning `progress | complete | perfect`. Components use that result for visuals (`CheckButton` bounce/fill, `Confetti` burst, full-screen `Confetti mode="rain"` on a perfect day). Sounds live in `src/lib/feedback.ts`, and `assets/sounds/*.wav` are synthesized by `node scripts/generate-sounds.js`. Audio respects the silent switch (`playsInSilentMode: false`), so test with the ringer on.
- **Notifications** (`src/lib/notifications.ts`): local only, no server. `planNotifications()` (pure) builds a rolling 7-day set of one-shot DATE notifications (morning check-in, per-habit reminders, evening nudge, a win-back at day 9), using live data for today's copy and skipping habits that are already done. `useNotificationSync` cancels and reschedules on every state change (debounced) and on app foreground, skipping notifications tagged `data.test`. The morning and evening times are the `MORNING`/`EVENING` constants there, and the Manage screen's setting labels repeat them as text, so change both together. Per-habit reminder times come from `REMINDER_PRESETS` (there's no time-picker dependency). Local notifications work in Expo Go. The plan stays under iOS's 64-pending cap. Taps route through `data.url`. Unsupported on web (`notificationsSupported`).
- **Dates**: always build keys with `dateKey()` from `src/lib/dates.ts`, never `toISOString()`, which would shift days across the UTC boundary. `currentStreak` counts back from today, or from yesterday if today isn't done yet.
- **Theming**: `src/constants/theme.ts` defines the `Colors` (light and dark), `Spacing` and `Fonts` tokens. Accent tokens `tint` and `success` are in `Colors` too. Use `ThemedText` / `ThemedView` (their `type` and `themeColor` props take theme keys) or `useTheme()` instead of hard-coding colors. Per-habit accent colors come from `HABIT_COLORS`; the code appends a hex alpha suffix (e.g. `color + '26'`) to make tints.
- **Web**: `app.json` sets `web.output: "server"`. `src/hooks/use-color-scheme.web.ts` returns `'light'` until hydration finishes to avoid SSR mismatches. Use the `@/hooks/use-color-scheme` import (not `react-native`'s hook directly) wherever that matters.
- Path aliases: `@/*` → `src/*`, `@/assets/*` → `assets/*`.
- Haptics and audio are fire-and-forget (`haptic.*`, `playSound`) because they're unavailable on web; never let them throw.
- `StyleSheet.absoluteFillObject` no longer exists in RN 0.88; use `StyleSheet.absoluteFill` or explicit position styles.
