import { forwardRef, useCallback, useImperativeHandle, useState, type ReactNode } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import {
  GestureDetector,
  useExclusiveGestures,
  usePanGesture,
  usePinchGesture,
  useSimultaneousGestures,
  useTapGesture,
} from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withDecay,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

export const MAX_SCALE = 3;
export const BASE_MIN_SCALE = 0.2;
const KEEP_VISIBLE = 80;
const BRAKE_WINDOW_MS = 600;

export type ZoomLevel = 'full' | 'initials' | 'dots';
export interface Viewport {
  x: number;
  y: number;
  scale: number;
}
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
export interface ViewportHandle {
  focus(cx: number, cy: number, opts?: { scale?: number; anchorY?: number }): void;
  fit(): void;
  zoomBy(factor: number): void;
}

const levelFor = (s: number): ZoomLevel => {
  'worklet';
  return s >= 0.5 ? 'full' : s >= 0.25 ? 'initials' : 'dots';
};

const clampT = (t: number, screen: number, content: number, s: number) => {
  'worklet';
  return Math.min(screen - KEEP_VISIBLE, Math.max(KEEP_VISIBLE - content * s, t));
};

export const TreeViewport = forwardRef<
  ViewportHandle,
  {
    contentWidth: number;
    contentHeight: number;
    initial: (screen: { w: number; h: number }) => Viewport;
    onSettle: (v: Viewport) => void;
    onTap: (x: number, y: number, scale: number) => void;
    children: (visible: Rect, level: ZoomLevel) => ReactNode;
  }
>(function TreeViewport({ contentWidth, contentHeight, initial, onSettle, onTap, children }, ref) {
  const [screen, setScreen] = useState<{ w: number; h: number } | null>(null);
  const [visible, setVisible] = useState<Rect>({ x: 0, y: 0, w: 0, h: 0 });
  const [level, setLevel] = useState<ZoomLevel>('full');

  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const s = useSharedValue(1);
  const sw = useSharedValue(0);
  const sh = useSharedValue(0);
  const cw = useSharedValue(contentWidth);
  const ch = useSharedValue(contentHeight);
  cw.value = contentWidth;
  ch.value = contentHeight;
  const moving = useSharedValue(false);
  const brakedAt = useSharedValue(0);
  const rendered = useSharedValue({ x: 0, y: 0, w: 0, h: 0, level: '' });

  const minScale = () => {
    'worklet';
    const fit = Math.min(sw.value / Math.max(cw.value, 1), sh.value / Math.max(ch.value, 1));
    return Math.min(BASE_MIN_SCALE, fit * 0.9);
  };

  const onLayout = (e: LayoutChangeEvent) => {
    const { width: w, height: h } = e.nativeEvent.layout;
    sw.value = w;
    sh.value = h;
    if (!screen) {
      const v = initial({ w, h });
      tx.value = v.x;
      ty.value = v.y;
      s.value = v.scale;
    }
    setScreen({ w, h });
  };

  const settle = useCallback(() => onSettle({ x: tx.value, y: ty.value, scale: s.value }), [onSettle, tx, ty, s]);

  // Re-render the culled content only when the view leaves the rendered area or crosses a zoom level.
  const updateVisible = useCallback((r: Rect, l: ZoomLevel) => {
    setVisible(r);
    setLevel(l);
  }, []);
  useAnimatedReaction(
    () => ({ x: tx.value, y: ty.value, s: s.value, w: sw.value, h: sh.value }),
    cur => {
      if (!cur.w) return;
      const vx = -cur.x / cur.s;
      const vy = -cur.y / cur.s;
      const vw = cur.w / cur.s;
      const vh = cur.h / cur.s;
      const r = rendered.value;
      const inside = vx >= r.x && vy >= r.y && vx + vw <= r.x + r.w && vy + vh <= r.y + r.h;
      const lvl = levelFor(cur.s);
      if (inside && lvl === r.level && r.w <= vw * 4) return;
      const next = { x: vx - vw, y: vy - vh, w: vw * 3, h: vh * 3 };
      rendered.value = { ...next, level: lvl };
      scheduleOnRN(updateVisible, next, lvl);
    },
  );

  const brake = () => {
    'worklet';
    if (moving.value) {
      brakedAt.value = Date.now();
      moving.value = false;
    }
    cancelAnimation(tx);
    cancelAnimation(ty);
    cancelAnimation(s);
  };

  const pan = usePanGesture({
    maxPointers: 2,
    onBegin: () => {
      'worklet';
      brake();
    },
    onUpdate: e => {
      'worklet';
      tx.value = clampT(tx.value + e.changeX, sw.value, cw.value, s.value);
      ty.value = clampT(ty.value + e.changeY, sh.value, ch.value, s.value);
    },
    onDeactivate: e => {
      'worklet';
      moving.value = true;
      const done = (finished?: boolean) => {
        'worklet';
        if (finished) {
          moving.value = false;
          scheduleOnRN(settle);
        }
      };
      const xLo = KEEP_VISIBLE - cw.value * s.value;
      const yLo = KEEP_VISIBLE - ch.value * s.value;
      tx.value = withDecay({ velocity: e.velocityX, clamp: [xLo, sw.value - KEEP_VISIBLE] }, done);
      ty.value = withDecay({ velocity: e.velocityY, clamp: [yLo, sh.value - KEEP_VISIBLE] });
    },
  });

  const zoomAt = (fx: number, fy: number, next: number) => {
    'worklet';
    const clamped = Math.min(MAX_SCALE, Math.max(minScale(), next));
    const k = clamped / s.value;
    tx.value = fx - (fx - tx.value) * k;
    ty.value = fy - (fy - ty.value) * k;
    s.value = clamped;
  };

  const pinch = usePinchGesture({
    onBegin: () => {
      'worklet';
      brake();
    },
    onUpdate: e => {
      'worklet';
      zoomAt(e.focalX, e.focalY, s.value * e.scaleChange);
    },
    onDeactivate: () => {
      'worklet';
      tx.value = clampT(tx.value, sw.value, cw.value, s.value);
      ty.value = clampT(ty.value, sh.value, ch.value, s.value);
      scheduleOnRN(settle);
    },
  });

  const animateTo = (x: number, y: number, scale: number) => {
    'worklet';
    const cfg = { duration: 280 };
    tx.value = withTiming(x, cfg);
    ty.value = withTiming(y, cfg);
    s.value = withTiming(scale, cfg, finished => {
      'worklet';
      if (finished) scheduleOnRN(settle);
    });
  };

  const doubleTap = useTapGesture({
    numberOfTaps: 2,
    onActivate: e => {
      'worklet';
      const next = Math.min(MAX_SCALE, s.value * 2);
      const k = next / s.value;
      animateTo(e.x - (e.x - tx.value) * k, e.y - (e.y - ty.value) * k, next);
    },
  });

  const tap = useTapGesture({
    onActivate: e => {
      'worklet';
      if (Date.now() - brakedAt.value < BRAKE_WINDOW_MS) return;
      scheduleOnRN(onTap, (e.x - tx.value) / s.value, (e.y - ty.value) / s.value, s.value);
    },
  });

  const taps = useExclusiveGestures(doubleTap, tap);
  const gesture = useSimultaneousGestures(pan, pinch, taps);

  useImperativeHandle(ref, () => ({
    focus(cx, cy, opts) {
      const scale = Math.min(MAX_SCALE, Math.max(opts?.scale ?? Math.max(s.value, 0.8), BASE_MIN_SCALE));
      const x = sw.value / 2 - cx * scale;
      const y = sh.value * (opts?.anchorY ?? 0.4) - cy * scale;
      animateTo(x, y, scale);
    },
    fit() {
      const scale = Math.min(1, Math.min(sw.value / cw.value, sh.value / ch.value) * 0.95);
      animateTo((sw.value - cw.value * scale) / 2, Math.max(0, (sh.value - ch.value * scale) / 2), scale);
    },
    zoomBy(factor) {
      const next = Math.min(MAX_SCALE, Math.max(minScale(), s.value * factor));
      const k = next / s.value;
      const fx = sw.value / 2;
      const fy = sh.value / 2;
      animateTo(fx - (fx - tx.value) * k, fy - (fy - ty.value) * k, next);
    },
  }));

  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: s.value }],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <View style={styles.fill} onLayout={onLayout} collapsable={false}>
        {screen ? (
          <Animated.View
            style={[{ width: contentWidth, height: contentHeight, transformOrigin: 'top left' }, contentStyle]}>
            {children(visible, level)}
          </Animated.View>
        ) : null}
      </View>
    </GestureDetector>
  );
});

const styles = StyleSheet.create({
  fill: { flex: 1, overflow: 'hidden' },
});
