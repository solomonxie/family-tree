import { Pressable, StyleSheet, type ViewStyle } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from './themed-text';

export type ButtonKind = 'primary' | 'secondary' | 'text' | 'destructive';

export function Button({
  title,
  onPress,
  kind = 'secondary',
  disabled,
  style,
  compact,
}: {
  title: string;
  onPress: () => void;
  kind?: ButtonKind;
  disabled?: boolean;
  style?: ViewStyle;
  compact?: boolean;
}) {
  const theme = useTheme();
  const bg =
    kind === 'primary' ? theme.accent : kind === 'secondary' ? theme.backgroundSelected : 'transparent';
  const fg =
    kind === 'primary' ? theme.accentText : kind === 'destructive' ? theme.danger : theme.accent;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      hitSlop={6}
      style={({ pressed }) => [
        styles.base,
        compact && styles.compact,
        { backgroundColor: bg, opacity: disabled ? 0.4 : pressed ? 0.7 : 1 },
        style,
      ]}>
      <ThemedText type="headline" style={{ color: fg }} numberOfLines={1}>
        {title}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    paddingHorizontal: 18,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compact: { minHeight: 36, paddingHorizontal: 12, borderRadius: 9 },
});
