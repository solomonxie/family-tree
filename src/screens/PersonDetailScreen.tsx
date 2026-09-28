import { useLayoutEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { Row, Section } from '@/components/list';
import { confirm } from '@/components/menu';
import { ThemedText } from '@/components/themed-text';
import { showToast } from '@/components/toast';
import { Spacing } from '@/constants/theme';
import { formatYear, isLiving, lifespan, lifespanLong } from '@/domain/format';
import { childrenOf, parentsOf, spousesOf } from '@/domain/rules';
import type { Person } from '@/domain/types';
import { useTheme } from '@/hooks/use-theme';
import type { ScreenProps } from '@/navigation/types';
import { mutate, usePerson, useTree } from '@/state/store';
import * as repo from '@/storage/repo';

export function PersonDetailScreen({ route, navigation }: ScreenProps<'PersonDetail'>) {
  const theme = useTheme();
  const person = usePerson(route.params.personId);
  const { tree, persons, relationships } = useTree(person?.treeId ?? '');
  const [notesOpen, setNotesOpen] = useState(false);
  const readOnly = tree?.kind === 'bundled';

  useLayoutEffect(() => {
    navigation.setOptions({
      title: '',
      headerBackTitle: tree?.title,
      headerRight: () =>
        readOnly || !person ? null : (
          <Pressable
            hitSlop={10}
            onPress={() => navigation.navigate('PersonForm', { treeId: person.treeId, personId: person.id })}>
            <ThemedText type="headline" style={{ color: theme.accent }}>
              Edit
            </ThemedText>
          </Pressable>
        ),
    });
  }, [navigation, tree?.title, readOnly, person, theme.accent]);

  const relatives = useMemo(() => {
    if (!person) return undefined;
    const byId = new Map(persons.map(p => [p.id, p]));
    const pick = (ids: string[]) =>
      ids
        .map(id => byId.get(id))
        .filter((p): p is Person => !!p)
        .sort((a, b) => (a.birthYear ?? 1e9) - (b.birthYear ?? 1e9));
    return {
      parents: pick(parentsOf(person.id, relationships)),
      spouses: pick(spousesOf(person.id, relationships)),
      children: pick(childrenOf(person.id, relationships)),
    };
  }, [person, persons, relationships]);

  if (!person || !relatives) {
    return (
      <View style={[styles.fill, styles.center]}>
        <ThemedText themeColor="textSecondary">This person was removed.</ThemedText>
      </View>
    );
  }

  const showOnTree = () => navigation.popTo('Canvas', { treeId: person.treeId, focusId: person.id, focusNonce: Date.now() });
  const del = () => {
    const links = relatives.parents.length + relatives.spouses.length + relatives.children.length;
    confirm(
      `Delete ${person.name}?`,
      links ? `Their links to ${links} ${links === 1 ? 'relative are' : 'relatives are'} removed too.` : 'This can’t be undone.',
      'Delete',
      () => {
        const deleted = mutate(() => repo.deletePerson(person.id));
        navigation.goBack();
        showToast(`${person.name} deleted`, { label: 'Undo', onPress: () => mutate(() => repo.restorePerson(deleted)) });
      },
    );
  };

  const relativeRows = (list: Person[]) =>
    list.map(p => (
      <Row
        key={p.id}
        label={p.name}
        value={lifespan(p)}
        left={<Avatar name={p.name} photoPath={p.photoPath} size={32} />}
        chevron
        onPress={() => navigation.push('PersonDetail', { personId: p.id })}
      />
    ));

  const living = isLiving(person);
  return (
    <ScrollView style={styles.fill} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Avatar name={person.name} photoPath={person.photoPath} size={112} />
        <ThemedText type="title" style={styles.centerText}>
          {person.name}
        </ThemedText>
        <ThemedText type="subhead" themeColor="textSecondary" style={styles.centerText}>
          {[lifespanLong(person), person.originRegion].filter(Boolean).join(' · ')}
        </ThemedText>
      </View>

      <Section>
        <Row label="Born" value={person.birthYear !== undefined ? formatYear(person.birthYear, person.datesApprox) : '—'} />
        <Row
          label="Died"
          value={person.deathYear !== undefined ? formatYear(person.deathYear, person.datesApprox) : living ? 'Living' : '—'}
        />
        <Row label="Origin" value={person.originRegion ?? '—'} />
        {person.sex ? <Row label="Sex" value={person.sex === 'f' ? 'Female' : 'Male'} /> : null}
      </Section>

      {relatives.parents.length ? <Section title="Parents">{relativeRows(relatives.parents)}</Section> : null}
      {relatives.spouses.length ? (
        <Section title={relatives.spouses.length > 1 ? 'Partners' : 'Partner'}>{relativeRows(relatives.spouses)}</Section>
      ) : null}
      {relatives.children.length ? <Section title="Children">{relativeRows(relatives.children)}</Section> : null}

      {person.notes ? (
        <View style={styles.notes}>
          <ThemedText type="section" style={styles.notesTitle}>
            Notes
          </ThemedText>
          <Pressable onPress={() => setNotesOpen(o => !o)}>
            <ThemedText numberOfLines={notesOpen ? undefined : 3}>{person.notes}</ThemedText>
            {!notesOpen && person.notes.length > 140 ? (
              <ThemedText style={{ color: theme.accent }}>More</ThemedText>
            ) : null}
          </Pressable>
        </View>
      ) : null}

      <View style={styles.actions}>
        <Button title="Show on tree" onPress={showOnTree} style={styles.flex} />
        {readOnly ? null : <Button kind="destructive" title="Delete" onPress={del} />}
      </View>
      {readOnly && tree?.source ? (
        <ThemedText type="caption" themeColor="textSecondary" style={styles.centerText}>
          From “{tree.title}” · {tree.source} · read-only
        </ThemedText>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  content: { padding: Spacing.three, paddingBottom: Spacing.six },
  hero: { alignItems: 'center', gap: Spacing.two, marginBottom: Spacing.four },
  centerText: { textAlign: 'center' },
  notes: { marginBottom: Spacing.four, paddingHorizontal: Spacing.three },
  notesTitle: { marginBottom: Spacing.two },
  actions: { flexDirection: 'row', gap: Spacing.three, marginBottom: Spacing.three },
  flex: { flex: 1 },
});
