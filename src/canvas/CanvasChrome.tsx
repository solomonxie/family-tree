import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { SlideInDown, SlideOutDown } from 'react-native-reanimated';

import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { lifespanLong } from '@/domain/format';
import type { Person } from '@/domain/types';
import { useTheme } from '@/hooks/use-theme';
import type { LegendItem } from './origins';

export type Relation = 'parent' | 'child' | 'spouse';

export function PersonCard({
  person,
  readOnly,
  parentBlockedReason,
  bottomInset,
  onOpen,
  onAdd,
  onDuplicate,
}: {
  person: Person;
  readOnly: boolean;
  parentBlockedReason?: string;
  bottomInset: number;
  onOpen: () => void;
  onAdd: (r: Relation) => void;
  onDuplicate: () => void;
}) {
  const theme = useTheme();
  const subtitle = [lifespanLong(person), person.originRegion].filter(Boolean).join(' · ');
  return (
    <Animated.View
      entering={SlideInDown.duration(200)}
      exiting={SlideOutDown.duration(160)}
      style={[
        styles.card,
        { backgroundColor: theme.backgroundElement, borderColor: theme.border, paddingBottom: bottomInset + Spacing.three },
      ]}>
      <View style={[styles.grabber, { backgroundColor: theme.border }]} />
      <Pressable onPress={onOpen} style={styles.header} accessibilityRole="button" accessibilityHint="Opens details">
        <Avatar name={person.name} photoPath={person.photoPath} size={48} />
        <View style={styles.headerText}>
          <ThemedText type="headline" numberOfLines={1}>
            {person.name}
          </ThemedText>
          {subtitle ? (
            <ThemedText type="subhead" themeColor="textSecondary" numberOfLines={1}>
              {subtitle}
            </ThemedText>
          ) : null}
        </View>
        <ThemedText style={{ color: theme.accent }}>Open ›</ThemedText>
      </Pressable>
      {readOnly ? (
        <Pressable onPress={onDuplicate} accessibilityRole="button" style={styles.readOnly}>
          <ThemedText type="subhead" themeColor="textSecondary">
            Read-only ·{' '}
          </ThemedText>
          <ThemedText type="subhead" style={{ color: theme.accent }}>
            Duplicate to edit…
          </ThemedText>
        </Pressable>
      ) : (
        <>
          <View style={styles.actions}>
            <Button compact title="+ Parent" onPress={() => onAdd('parent')} disabled={!!parentBlockedReason} style={styles.flex} />
            <Button compact title="+ Child" onPress={() => onAdd('child')} style={styles.flex} />
            <Button compact title="+ Spouse" onPress={() => onAdd('spouse')} style={styles.flex} />
          </View>
          {parentBlockedReason ? (
            <ThemedText type="caption" themeColor="textSecondary" style={styles.hint}>
              {parentBlockedReason.replace(/\.$/, '')}
            </ThemedText>
          ) : null}
        </>
      )}
    </Animated.View>
  );
}

export function OriginLegend({
  items,
  selected,
  onSelect,
}: {
  items: LegendItem[];
  selected?: string;
  onSelect: (origin?: string) => void;
}) {
  const theme = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.legend}>
      {items.map(item => {
        const on = selected === item.origin;
        return (
          <Pressable
            key={item.origin}
            onPress={() => onSelect(on ? undefined : item.origin)}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            accessibilityLabel={`${item.origin}, ${item.count} people`}
            style={[
              styles.chip,
              {
                backgroundColor: on ? theme.text : theme.backgroundElement,
                borderColor: theme.border,
                opacity: selected && !on ? 0.6 : 1,
              },
            ]}>
            <View style={[styles.dot, { backgroundColor: item.color, borderColor: theme.border }]} />
            <ThemedText type="subhead" numberOfLines={1} style={{ color: on ? theme.background : theme.text }}>
              {item.origin}
            </ThemedText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function ZoomControls({ onIn, onOut, onFit }: { onIn: () => void; onOut: () => void; onFit: () => void }) {
  const theme = useTheme();
  const btn = (label: string, a11y: string, onPress: () => void) => (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={a11y}
      style={({ pressed }) => [styles.zoomBtn, pressed && { backgroundColor: theme.backgroundSelected }]}>
      <ThemedText type="title" style={styles.zoomGlyph}>
        {label}
      </ThemedText>
    </Pressable>
  );
  return (
    <View style={[styles.zoom, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      {btn('+', 'Zoom in', onIn)}
      <View style={[styles.zoomDivider, { backgroundColor: theme.border }]} />
      {btn('−', 'Zoom out', onOut)}
      <View style={[styles.zoomDivider, { backgroundColor: theme.border }]} />
      {btn('⤢', 'Fit whole tree', onFit)}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    gap: Spacing.three,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
  },
  grabber: { alignSelf: 'center', width: 36, height: 5, borderRadius: 3 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerText: { flex: 1 },
  actions: { flexDirection: 'row', gap: Spacing.two },
  flex: { flex: 1 },
  hint: { marginTop: -Spacing.two },
  readOnly: { flexDirection: 'row', paddingVertical: Spacing.one },
  legend: { gap: Spacing.two, paddingHorizontal: Spacing.three },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: 220,
  },
  dot: { width: 12, height: 12, borderRadius: 6, borderWidth: StyleSheet.hairlineWidth },
  zoom: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  zoomBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  zoomGlyph: { fontSize: 22, lineHeight: 26, fontWeight: '500' },
  zoomDivider: { height: StyleSheet.hairlineWidth },
});
