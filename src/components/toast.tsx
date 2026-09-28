import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { useScheme, useTheme } from '@/hooks/use-theme';
import { ThemedText } from './themed-text';

interface ToastMsg {
  id: number;
  text: string;
  action?: { label: string; onPress: () => void };
}

let current: ToastMsg | undefined;
let seq = 0;
const listeners = new Set<(t?: ToastMsg) => void>();

export function showToast(text: string, action?: ToastMsg['action']) {
  current = { id: ++seq, text, action };
  listeners.forEach(l => l(current));
}

export function ToastHost() {
  const theme = useTheme();
  const inverseAccent = useScheme() === 'light' ? Colors.dark.accent : Colors.light.accent;
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastMsg | undefined>(current);
  useEffect(() => {
    listeners.add(setToast);
    return () => {
      listeners.delete(setToast);
    };
  }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(undefined), toast.action ? 5000 : 2500);
    return () => clearTimeout(t);
  }, [toast]);
  if (!toast) return null;
  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: insets.bottom + 24 }]}>
      <Animated.View
        key={toast.id}
        entering={FadeInDown.duration(180)}
        exiting={FadeOutDown.duration(150)}
        style={[styles.toast, { backgroundColor: theme.text }]}>
        <ThemedText style={{ color: theme.background, flexShrink: 1 }} numberOfLines={2}>
          {toast.text}
        </ThemedText>
        {toast.action ? (
          <Pressable
            hitSlop={10}
            onPress={() => {
              toast.action!.onPress();
              setToast(undefined);
            }}>
            <ThemedText type="headline" style={{ color: inverseAccent }}>
              {toast.action.label}
            </ThemedText>
          </Pressable>
        ) : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 16, right: 16, alignItems: 'center' },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
    maxWidth: 480,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
});
