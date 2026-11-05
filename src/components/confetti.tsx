import { useEffect } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { HABIT_COLORS } from '@/lib/habits';

/** Deterministic 0…1 noise so particle layout is a pure function of (seed, index). */
function rand(seed: number, i: number, salt: number) {
  const x = Math.sin(seed * 12.9898 + i * 78.233 + salt * 37.719) * 43758.5453;
  return x - Math.floor(x);
}

type Particle = {
  /** Start position (rain) or 0,0 (burst). */
  x0: number;
  y0: number;
  dx: number;
  dy: number;
  fall: number;
  spin: number;
  sway: number;
  delay: number;
  w: number;
  h: number;
  round: boolean;
  color: string;
};

type Props = {
  /** Increment to fire. 0 renders nothing. */
  trigger: number;
  mode?: 'burst' | 'rain';
  count?: number;
  colors?: string[];
  /** Burst radius in px. */
  spread?: number;
};

/**
 * Lightweight confetti. One shared progress value drives every particle on the UI thread.
 * `burst` explodes out of its parent's center; `rain` falls across the whole parent.
 */
export function Confetti({ trigger, mode = 'burst', count, colors = HABIT_COLORS, spread = 90 }: Props) {
  const { width, height } = useWindowDimensions();
  const progress = useSharedValue(0);
  const n = count ?? (mode === 'rain' ? 70 : 22);
  const duration = mode === 'rain' ? 2800 : 900;

  useEffect(() => {
    if (trigger === 0) return;
    progress.value = 0;
    progress.value = withTiming(1, { duration, easing: Easing.linear });
  }, [trigger, duration, progress]);

  if (trigger === 0) return null;

  const particles: Particle[] = Array.from({ length: n }, (_, i) => {
    const r = (salt: number) => rand(trigger, i, salt);
    if (mode === 'rain') {
      return {
        x0: r(1) * width,
        y0: -30 - r(2) * 80,
        dx: (r(3) - 0.5) * 60,
        dy: height * (0.9 + r(4) * 0.4),
        fall: 0,
        spin: (r(5) - 0.5) * 1440,
        sway: 10 + r(6) * 25,
        delay: r(7) * 0.35,
        w: 7 + r(8) * 5,
        h: 10 + r(9) * 8,
        round: r(10) > 0.75,
        color: colors[Math.floor(r(11) * colors.length)],
      };
    }
    // Burst: fan out mostly upward, then gravity pulls them down.
    const angle = -Math.PI / 2 + (r(1) - 0.5) * Math.PI * 1.6;
    const speed = spread * (0.55 + r(2) * 0.6);
    return {
      x0: 0,
      y0: 0,
      dx: Math.cos(angle) * speed,
      dy: Math.sin(angle) * speed,
      fall: spread * (0.6 + r(3) * 0.5),
      spin: (r(4) - 0.5) * 900,
      sway: 0,
      delay: r(5) * 0.08,
      w: 5 + r(6) * 4,
      h: 7 + r(7) * 6,
      round: r(8) > 0.6,
      color: colors[Math.floor(r(9) * colors.length)],
    };
  });

  return (
    <View
      style={[mode === 'rain' ? StyleSheet.absoluteFill : styles.burstOrigin, styles.noTouch]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      {particles.map((p, i) => (
        <ConfettiPiece key={`${trigger}-${i}`} p={p} progress={progress} mode={mode} />
      ))}
    </View>
  );
}

function ConfettiPiece({ p, progress, mode }: { p: Particle; progress: SharedValue<number>; mode: 'burst' | 'rain' }) {
  const style = useAnimatedStyle(() => {
    const t = Math.max(0, Math.min(1, (progress.value - p.delay) / (1 - p.delay)));
    if (mode === 'rain') {
      return {
        opacity: t === 0 || t === 1 ? 0 : t > 0.85 ? (1 - t) / 0.15 : 1,
        transform: [
          { translateX: p.x0 + p.dx * t + Math.sin(t * Math.PI * 4) * p.sway },
          { translateY: p.y0 + p.dy * t },
          { rotate: `${p.spin * t}deg` },
          { rotateX: `${p.spin * t * 0.7}deg` },
        ],
      };
    }
    const out = 1 - (1 - t) * (1 - t); // ease-out for the explosion
    return {
      opacity: t === 0 || t === 1 ? 0 : t > 0.6 ? (1 - t) / 0.4 : 1,
      transform: [
        { translateX: p.dx * out },
        { translateY: p.dy * out + p.fall * t * t },
        { rotate: `${p.spin * t}deg` },
        { scale: 1 - t * 0.4 },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        styles.piece,
        { width: p.w, height: p.round ? p.w : p.h, borderRadius: p.round ? p.w / 2 : 2, backgroundColor: p.color },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  noTouch: { pointerEvents: 'none' },
  burstOrigin: { position: 'absolute', left: '50%', top: '50%', width: 0, height: 0, overflow: 'visible' },
  piece: { position: 'absolute', left: 0, top: 0 },
});
