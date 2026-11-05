import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Confetti } from '@/components/confetti';
import { ThemedText } from '@/components/themed-text';

type Props = {
  color: string;
  /** 0…1; the button fills from the bottom like a glass. */
  progress: number;
  /** Text shown while not done (e.g. "2/8"); null for none. */
  label: string | null;
  done: boolean;
  /** Increment to play the bounce. */
  bounce: number;
  /** Increment to fire a confetti burst. */
  burst: number;
  onPress: () => void;
  onLongPress?: () => void;
  accessibilityLabel: string;
  accessibilityHint?: string;
  size?: number;
};

export function CheckButton({
  color,
  progress,
  label,
  done,
  bounce,
  burst,
  onPress,
  onLongPress,
  accessibilityLabel,
  accessibilityHint,
  size = 48,
}: Props) {
  const fill = useSharedValue(progress);
  const scale = useSharedValue(1);

  useEffect(() => {
    fill.value = withSpring(progress, { damping: 15, stiffness: 140 });
  }, [progress, fill]);

  useEffect(() => {
    if (bounce === 0) return;
    scale.value = withSequence(withTiming(1.22, { duration: 110 }), withSpring(1, { damping: 7, stiffness: 220 }));
  }, [bounce, scale]);

  const fillStyle = useAnimatedStyle(() => ({ transform: [{ translateY: (1 - fill.value) * size }] }));
  const scaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <View>
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityState={{ checked: done }}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}>
        <Animated.View
          style={[
            styles.circle,
            { width: size, height: size, borderRadius: size / 2, borderColor: color },
            scaleStyle,
          ]}>
          <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: color }, fillStyle]} />
          {done ? (
            <ThemedText style={styles.check}>✓</ThemedText>
          ) : label ? (
            <ThemedText style={[styles.label, progress >= 0.5 && styles.labelOnFill]}>{label}</ThemedText>
          ) : null}
        </Animated.View>
      </Pressable>
      <Confetti trigger={burst} colors={[color, '#FFD23F', '#FF8FB1', color]} spread={80} />
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    borderWidth: 2.5,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: { color: '#fff', fontSize: 22, lineHeight: 26, fontWeight: 800 },
  label: { fontSize: 13, lineHeight: 16, fontWeight: 700, fontVariant: ['tabular-nums'] },
  labelOnFill: { color: '#fff' },
});
