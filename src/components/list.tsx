import { Children, Fragment, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from './themed-text';

export function Section({ title, right, children }: { title?: string; right?: ReactNode; children: ReactNode }) {
  const theme = useTheme();
  const items = Children.toArray(children).filter(Boolean);
  return (
    <View style={styles.section}>
      {title ? (
        <View style={styles.header}>
          <ThemedText type="section">{title}</ThemedText>
          {right}
        </View>
      ) : null}
      <View style={[styles.group, { backgroundColor: theme.backgroundElement }]}>
        {items.map((child, i) => (
          <Fragment key={i}>
            {i > 0 && <View style={[styles.divider, { backgroundColor: theme.border }]} />}
            {child}
          </Fragment>
        ))}
      </View>
    </View>
  );
}

export interface RowProps {
  label: string;
  detail?: string;
  value?: string;
  left?: ReactNode;
  right?: ReactNode;
  chevron?: boolean;
  destructive?: boolean;
  labelColor?: string;
  onPress?: () => void;
  onLongPress?: () => void;
  numberOfLines?: number;
  accessibilityLabel?: string;
}

export function Row(p: RowProps) {
  const theme = useTheme();
  const body = (
    <View style={styles.row}>
      {p.left}
      <View style={styles.rowText}>
        <ThemedText
          numberOfLines={p.numberOfLines ?? 1}
          style={p.destructive ? { color: theme.danger } : p.labelColor ? { color: p.labelColor } : undefined}>
          {p.label}
        </ThemedText>
        {p.detail ? (
          <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
            {p.detail}
          </ThemedText>
        ) : null}
      </View>
      {p.value ? (
        <ThemedText themeColor="textSecondary" numberOfLines={1} style={styles.value}>
          {p.value}
        </ThemedText>
      ) : null}
      {p.right}
      {p.chevron ? <ThemedText themeColor="textSecondary" style={styles.chevron}>›</ThemedText> : null}
    </View>
  );
  if (!p.onPress && !p.onLongPress) return body;
  return (
    <Pressable
      onPress={p.onPress}
      onLongPress={p.onLongPress}
      accessibilityRole="button"
      accessibilityLabel={p.accessibilityLabel}
      style={({ pressed }) => pressed && { backgroundColor: theme.backgroundSelected }}>
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: Spacing.four },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.three,
    marginBottom: Spacing.two,
  },
  group: { borderRadius: 12, overflow: 'hidden' },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: Spacing.three },
  row: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: 10,
    gap: 12,
  },
  rowText: { flex: 1, gap: 1 },
  value: { flexShrink: 1, textAlign: 'right', maxWidth: '60%' },
  chevron: { fontSize: 22, lineHeight: 24 },
});
