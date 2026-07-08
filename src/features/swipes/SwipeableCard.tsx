// Drag-to-swipe wrapper for the swipe deck.
//
// Custom built on react-native-gesture-handler 2.28 + reanimated 4.1 —
// react-native-deck-swiper is a few major versions stale and breaks against
// Reanimated 4's worklet pipeline. Gated by app_prefs.gesture_swiping; the
// deck screen passes enabled=false when the recruiter hasn't opted in and
// the wrapper just renders children as a normal View.
//
// Gesture model:
// - Pan tracks translation. Card translates and rotates slightly for the
//   Tinder feel.
// - On release, if |translateX| or -translateY crosses SWIPE_THRESHOLD,
//   animate off-screen and call onSwipe(direction). Otherwise spring back.
// - Once the candidate index advances, parent re-mounts this component
//   (key={candidate.externalId}), which resets translateX/Y to 0 for the
//   next card — no manual reset needed inside the component.
// - The card body scrolls (CandidateCard wraps its content in a
//   gesture-handler ScrollView), so the pan claims horizontal drags only:
//   activeOffsetX activates past a small horizontal slop and failOffsetY
//   hands clean vertical drags to the ScrollView. Consequence: the up-swipe
//   (Boost) gesture only works when the card content doesn't scroll; the
//   Boost button is the always-available path. Tune the offsets on-device.

import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import type { SwipeDirection } from '@/ats/types';

const SWIPE_THRESHOLD = 120;
const OFF_SCREEN_X = 600;
const OFF_SCREEN_Y = 800;
const ROTATION_FACTOR = 0.05;

export interface SwipeableCardProps {
  enabled: boolean;
  onSwipe: (direction: SwipeDirection) => void;
  children: ReactNode;
}

export function SwipeableCard({ enabled, onSwipe, children }: SwipeableCardProps) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const fire = (direction: SwipeDirection) => onSwipe(direction);

  const gesture = Gesture.Pan()
    .enabled(enabled)
    // Horizontal drags swipe; vertical drags scroll the card body.
    .activeOffsetX([-15, 15])
    .failOffsetY([-15, 15])
    .onUpdate((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY;
    })
    .onEnd(() => {
      const x = translateX.value;
      const y = translateY.value;
      if (x > SWIPE_THRESHOLD) {
        translateX.value = withTiming(OFF_SCREEN_X, { duration: 200 }, () => {
          runOnJS(fire)('right');
        });
      } else if (x < -SWIPE_THRESHOLD) {
        translateX.value = withTiming(-OFF_SCREEN_X, { duration: 200 }, () => {
          runOnJS(fire)('left');
        });
      } else if (y < -SWIPE_THRESHOLD && Math.abs(x) < SWIPE_THRESHOLD) {
        translateY.value = withTiming(-OFF_SCREEN_Y, { duration: 200 }, () => {
          runOnJS(fire)('up');
        });
      } else {
        translateX.value = withSpring(0, { damping: 15 });
        translateY.value = withSpring(0, { damping: 15 });
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${translateX.value * ROTATION_FACTOR}deg` },
    ],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.fill, animatedStyle]}>{children}</Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  // flex: 1 so the info-first card fills the deck area (content used to size
  // the card when the photo was the hero; now the layout owns the height).
  fill: { width: '100%', flex: 1 },
});
