import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { lifespan } from '@/domain/format';
import { useTheme } from '@/hooks/use-theme';
import { layoutTree } from '@/layout/layout';
import type { ScreenProps } from '@/navigation/types';
import { useTree } from '@/state/store';

export function FindScreen({ route, navigation }: ScreenProps<'Find'>) {
  const { treeId } = route.params;
  const theme = useTheme();
  const { persons, relationships } = useTree(treeId);
  const [q, setQ] = useState('');
  const gens = useMemo(() => layoutTree(persons, relationships).nodes, [persons, relationships]);

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return [];
    const scored = persons.flatMap(p => {
      const name = p.name.toLowerCase();
      const origin = p.originRegion?.toLowerCase() ?? '';
      const words = name.split(/\s+/);
      const score = name.startsWith(needle)
        ? 0
        : words.some(w => w.startsWith(needle))
          ? 1
          : name.includes(needle)
            ? 2
            : origin.includes(needle)
              ? 3
              : -1;
      return score < 0 ? [] : [{ p, score }];
    });
    return scored.sort((a, b) => a.score - b.score || a.p.name.localeCompare(b.p.name)).slice(0, 100);
  }, [persons, q]);

  const choose = (id: string) => navigation.popTo('Canvas', { treeId, focusId: id, focusNonce: Date.now() });

  return (
    <View style={[styles.fill, { backgroundColor: theme.background }]}>
      <View style={styles.bar}>
        <View style={[styles.search, { backgroundColor: theme.backgroundSelected }]}>
          <ThemedText themeColor="textSecondary">🔍</ThemedText>
          <TextInput
            autoFocus
            value={q}
            onChangeText={setQ}
            placeholder="Name or origin"
            placeholderTextColor={theme.textSecondary}
            returnKeyType="search"
            autoCorrect={false}
            onSubmitEditing={() => results[0] && choose(results[0].p.id)}
            style={[styles.input, { color: theme.text }]}
          />
        </View>
        <Pressable hitSlop={10} onPress={() => navigation.goBack()}>
          <ThemedText style={{ color: theme.accent }}>Cancel</ThemedText>
        </Pressable>
      </View>
      <FlatList
        data={results}
        keyExtractor={r => r.p.id}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          q.trim() ? (
            <ThemedText themeColor="textSecondary" style={styles.empty}>
              No one called “{q.trim()}”.
            </ThemedText>
          ) : null
        }
        renderItem={({ item: { p } }) => {
          const gen = gens.get(p.id)?.gen;
          const meta = [gen !== undefined ? `Gen ${gen + 1}` : '', lifespan(p)].filter(Boolean).join(' · ');
          return (
            <Pressable
              onPress={() => choose(p.id)}
              style={({ pressed }) => [styles.row, { borderColor: theme.border }, pressed && { backgroundColor: theme.backgroundSelected }]}>
              <View style={styles.flex}>
                <ThemedText numberOfLines={1}>{p.name}</ThemedText>
                {p.originRegion ? (
                  <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
                    {p.originRegion}
                  </ThemedText>
                ) : null}
              </View>
              <ThemedText type="caption" themeColor="textSecondary">
                {meta}
              </ThemedText>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  flex: { flex: 1 },
  bar: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.three, paddingTop: Spacing.four },
  search: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, paddingHorizontal: 10 },
  input: { flex: 1, fontSize: 17, paddingVertical: 9 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 52,
    paddingHorizontal: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  empty: { textAlign: 'center', marginTop: Spacing.five },
});
