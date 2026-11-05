# Habits

A small, rewarding habit tracker for iOS, Android and web, built with Expo and React Native.

Every check-in pays off with confetti, haptics and a chime. Challenges (3 → 7 → 14 → 30 days) give you something to aim for, and local reminders bring you back each day.

## Features

- **Two kinds of habits.** *Once a day* (check it off) or *several times* (count up to a daily goal, e.g. 8 glasses of water).
- **Rewards on every check-in.**
  - A step on a count habit fills the circle with a soft tap sound.
  - Finishing a habit plays a confetti burst and a two-note chime.
  - Finishing every habit for the day ("perfect day") rains confetti and plays a fanfare.
- **Challenges.** Onboarding starts a 3-day challenge. Finishing one opens a full-screen trophy moment and unlocks the next length.
- **History.** A 30-day consistency score, a 14-day chart, a trophy shelf, a day-by-day log, and a 16-week heatmap for each habit.
- **Reminders.** A morning check-in, a nudge at each habit's chosen time, and an evening reminder if something is still open.
  - The messages use today's real progress, e.g. "3/8 glasses so far" or "Day 2 of 3".
  - They stop once you're done for the day.
  - Everything is scheduled on the device; there's no server.
- **Small on purpose.** Seven screens: Onboarding, Today, History, Manage, New Habit, Habit detail, and the challenge celebration.

## Getting started

Requires Node.js and npm.

```bash
npm install
npx expo start
```

Then open the app in Expo Go, an iOS simulator, an Android emulator, or a web browser (press `w`). Reminders work in Expo Go on iOS and Android but not on the web.

| Command | What it does |
| --- | --- |
| `npm start` | Start the Expo dev server (`npm run ios` / `android` / `web` to open one directly) |
| `npm run lint` | ESLint (`eslint-config-expo`) |
| `npx tsc --noEmit` | Typecheck |
| `npx expo export --platform ios --output-dir /tmp/habits-export` | Full production bundle, which catches broken routes or assets the dev server only loads lazily |
| `node scripts/generate-sounds.js` | Regenerate the reward sounds in `assets/sounds/` |

Add dependencies with `npx expo install <package>`, so the versions match the Expo SDK. Don't run `npm run reset-project`, which is left over from the template and would delete the app's source.

## Testing the challenge flow

In development builds, **Manage** has a **Developer** section at the bottom. It lets you:

- jump the current challenge to any day (choose the final day, then check in on Today to win it for real)
- win immediately, or simulate a missed day
- replay the trophy screen
- send a test notification in 5 seconds and see what's scheduled
- play each reward sound
- reset to onboarding

These tools edit your real saved data and don't appear in production builds.

## How it's built

- **Expo SDK 58**, React Native 0.88, React 19, TypeScript (strict), with the React Compiler on.
- **Expo Router** for file-based routes in `src/app/`. A root stack shows either onboarding or the `(tabs)` group, which holds Today, History and Manage.
- **State** is one React context (`src/lib/habits-store.tsx`), saved to AsyncStorage as a single JSON blob.
- **Logic** for streaks, challenge outcomes and stats is in plain functions (`src/lib/habits.ts`, `src/lib/dates.ts`), separate from the UI.
- **Notifications** (`src/lib/notifications.ts`): the next week of one-off local notifications is rebuilt from live data whenever something changes or the app comes to the foreground.
- **Animations** use Reanimated (confetti, the filling check button). Sounds use `expo-audio`, haptics `expo-haptics`, and icons `expo-symbols`.
- **Sounds** are synthesized by a script, so there are no third-party audio files.

`CLAUDE.md` has more detailed notes on the architecture and conventions.
