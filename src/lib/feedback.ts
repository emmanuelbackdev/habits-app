/**
 * Sound + haptic feedback for the reward loop. Everything here is fire-and-forget:
 * haptics and audio can be unavailable (web, simulators, silent mode) and must never throw.
 */
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';

const SOURCES = {
  tap: require('@/assets/sounds/tap.wav'),
  complete: require('@/assets/sounds/complete.wav'),
  fanfare: require('@/assets/sounds/fanfare.wav'),
};

export type SoundName = keyof typeof SOURCES;

const players: Partial<Record<SoundName, AudioPlayer>> = {};
let soundsEnabled = true;
let initialized = false;

/** Call once at startup: mixes with other audio and respects the silent switch. */
export function initSounds() {
  if (initialized) return;
  initialized = true;
  setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' }).catch(() => {});
  for (const name of Object.keys(SOURCES) as SoundName[]) {
    try {
      players[name] = createAudioPlayer(SOURCES[name]);
    } catch {
      // Audio unavailable on this platform; play() will no-op.
    }
  }
}

export function setSoundsEnabled(enabled: boolean) {
  soundsEnabled = enabled;
}

export function playSound(name: SoundName) {
  if (!soundsEnabled) return;
  try {
    const player = (players[name] ??= createAudioPlayer(SOURCES[name]));
    player.seekTo(0).catch(() => {});
    player.play();
  } catch {
    // ignore
  }
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const haptic = {
  tick: () => Haptics.selectionAsync().catch(() => {}),
  light: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}),
  step: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}),
  success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}),
  /** A short drum-roll for big moments (perfect day, challenge won). */
  celebrate: async () => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      for (const style of [
        Haptics.ImpactFeedbackStyle.Light,
        Haptics.ImpactFeedbackStyle.Medium,
        Haptics.ImpactFeedbackStyle.Heavy,
      ]) {
        await wait(110);
        await Haptics.impactAsync(style);
      }
    } catch {
      // ignore
    }
  },
};
