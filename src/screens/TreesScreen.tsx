import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Section, Row } from '@/components/list';
import { showMenu } from '@/components/menu';
import { PromptModal, type PromptSpec } from '@/components/prompt';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { Tree } from '@/domain/types';
import { useTheme } from '@/hooks/use-theme';
import { mutate, useTrees } from '@/state/store';
import * as repo from '@/storage/repo';
import { SettingsSections } from './SettingsSections';
import { confirmDelete, duplicate, exportTree, renamePrompt } from './treeActions';

const shortDate = (ms: number) =>
  new Date(ms).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: new Date(ms).getFullYear() === new Date().getFullYear() ? undefined : 'numeric',
  });

const people = (n: number) => `${n} ${n === 1 ? 'person' : 'people'}`;

export function TreesScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const trees = useTrees();
  const [prompt, setPrompt] = useState<PromptSpec>();
  const mine = trees.filter(t => t.kind === 'user');
  const samples = trees.filter(t => t.kind === 'bundled');

  const open = (t: Tree) => navigation.navigate('Canvas', { treeId: t.id });
  const newTree = () =>
    setPrompt({
      title: 'New tree',
      placeholder: 'e.g. Dad’s side',
      action: 'Create',
      onSubmit: title => {
        const t = mutate(() => repo.createTree(title));
        open(t);
      },
    });
  const menu = (t: Tree & { personCount: number }) =>
    showMenu(
      t.title,
      t.kind === 'bundled'
        ? [
            { label: 'Duplicate to edit', onPress: () => open(duplicate(t)) },
            { label: 'Export…', onPress: () => exportTree(t) },
          ]
        : [
            { label: 'Rename', onPress: () => setPrompt(renamePrompt(t)) },
            { label: 'Duplicate', onPress: () => duplicate(t) },
            { label: 'Export…', onPress: () => exportTree(t) },
            { label: 'Delete', destructive: true, onPress: () => confirmDelete(t, t.personCount) },
          ],
    );

  return (
    <View style={[styles.fill, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.two, paddingBottom: insets.bottom + Spacing.six }]}>
        <View style={styles.titleRow}>
          <ThemedText type="largeTitle">Trees</ThemedText>
        </View>

        {mine.length ? (
          <Section title="My trees">
            {mine.map(t => (
              <Row
                key={t.id}
                label={t.title}
                detail={`${people(t.personCount)} · ${t.generations} ${t.generations === 1 ? 'generation' : 'generations'} · edited ${shortDate(t.updatedAt)}`}
                chevron
                onPress={() => open(t)}
                onLongPress={() => menu(t)}
              />
            ))}
            <Row label="New tree…" onPress={newTree} labelColor={theme.accent} />
          </Section>
        ) : (
          <View style={styles.sectionGap}>
            <ThemedText type="section" style={styles.sectionTitle}>
              My trees
            </ThemedText>
            <View style={[styles.empty, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="headline">No trees yet</ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.center}>
                Start with yourself and add outward.
              </ThemedText>
              <Button kind="primary" title="New tree" onPress={newTree} />
            </View>
          </View>
        )}

        <Section title="Samples" right={<ThemedText type="caption" themeColor="textSecondary">Read-only</ThemedText>}>
          {samples.map(t => (
            <Row
              key={t.id}
              label={t.title}
              detail={`${people(t.personCount)} · ${t.source ?? ''} · 🔒`}
              chevron
              onPress={() => open(t)}
              onLongPress={() => menu(t)}
            />
          ))}
        </Section>
        <SettingsSections />
      </ScrollView>
      <PromptModal spec={prompt} onClose={() => setPrompt(undefined)} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.six },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.three,
    paddingHorizontal: Spacing.one,
  },
  sectionGap: { marginBottom: Spacing.four },
  sectionTitle: { paddingHorizontal: Spacing.three, marginBottom: Spacing.two },
  empty: { borderRadius: 12, padding: Spacing.four, alignItems: 'center', gap: Spacing.two },
  center: { textAlign: 'center', marginBottom: Spacing.two },
});
