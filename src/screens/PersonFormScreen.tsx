import { useLayoutEffect, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';

import { Avatar } from '@/components/avatar';
import { showMenu } from '@/components/menu';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { parseYear, yearInputValue } from '@/domain/format';
import { childrenOf, parentsOf, spousesOf, validatePersonFields } from '@/domain/rules';
import type { Person, PersonDraft, Sex } from '@/domain/types';
import { useTheme } from '@/hooks/use-theme';
import type { ScreenProps } from '@/navigation/types';
import { mutate, useTree } from '@/state/store';
import { importPhoto } from '@/storage/photos';
import * as repo from '@/storage/repo';

type Choice = { id: string; name: string; on: boolean };

export function PersonFormScreen({ route, navigation }: ScreenProps<'PersonForm'>) {
  const { treeId, personId, relation, ofId } = route.params;
  const theme = useTheme();
  const { persons, relationships } = useTree(treeId);
  const editing = personId ? repo.getPerson(personId) : undefined;
  const of = ofId ? persons.find(p => p.id === ofId) : undefined;

  const [name, setName] = useState(editing?.name ?? '');
  const [born, setBorn] = useState(yearInputValue(editing?.birthYear, editing?.datesApprox));
  const [died, setDied] = useState(yearInputValue(editing?.deathYear, editing?.datesApprox));
  const [sex, setSex] = useState<Sex | undefined>(editing?.sex);
  const [origin, setOrigin] = useState(editing?.originRegion ?? (relation === 'child' ? of?.originRegion ?? '' : ''));
  const [notes, setNotes] = useState(editing?.notes ?? '');
  const [photoPath, setPhotoPath] = useState(editing?.photoPath);
  const [originOpen, setOriginOpen] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  const byId = useMemo(() => new Map(persons.map(p => [p.id, p])), [persons]);
  const [choices, setChoices] = useState<Choice[]>(() => {
    if (!of) return [];
    const named = (ids: string[], on: (id: string) => boolean) =>
      ids.flatMap(id => (byId.get(id) ? [{ id, name: byId.get(id)!.name, on: on(id) }] : []));
    if (relation === 'child') {
      const sp = spousesOf(of.id, relationships);
      return named(sp, () => sp.length === 1);
    }
    if (relation === 'parent') return named(parentsOf(of.id, relationships), () => true);
    if (relation === 'spouse') {
      return named(
        childrenOf(of.id, relationships).filter(c => parentsOf(c, relationships).length === 1),
        () => true,
      );
    }
    return [];
  });
  const choiceTitle =
    relation === 'child' ? 'Also child of' : relation === 'parent' ? 'Partner of' : relation === 'spouse' ? 'Also parent of' : '';

  const b = parseYear(born);
  const d = parseYear(died);
  const fieldErrors = validatePersonFields({ name, birthYear: b.year, deathYear: d.year });
  const errors = {
    name: fieldErrors.name,
    born: b.error ?? fieldErrors.birthYear,
    died: d.error ?? fieldErrors.deathYear,
  };
  const valid = !errors.name && !errors.born && !errors.died;

  const title = editing
    ? `Edit ${editing.name}`
    : of && relation
      ? `Add ${relation} of ${of.name}`
      : 'New person';

  const suggestions = useMemo(() => {
    const all = new Set([...persons.map(p => p.originRegion).filter(Boolean), ...repo.originsInUse()] as string[]);
    const q = origin.trim().toLowerCase();
    return [...all].filter(o => !q || o.toLowerCase().includes(q)).slice(0, 8);
  }, [persons, origin]);

  const save = () => {
    if (!valid) {
      setShowErrors(true);
      return;
    }
    const draft: PersonDraft = {
      name: name.trim(),
      sex,
      birthYear: b.year,
      deathYear: d.year,
      datesApprox: b.approx || d.approx || undefined,
      originRegion: origin.trim() || undefined,
      notes: notes.trim() || undefined,
      photoPath,
    };
    try {
      if (editing) {
        mutate(() => repo.updatePerson(editing.id, draft));
        navigation.goBack();
        return;
      }
      const links: repo.NewLink[] = [];
      if (of && relation === 'parent') {
        links.push({ type: 'parent', newPersonIs: 'from', otherId: of.id });
        choices.filter(c => c.on).forEach(c => links.push({ type: 'spouse', newPersonIs: 'from', otherId: c.id }));
      } else if (of && relation === 'child') {
        links.push({ type: 'parent', newPersonIs: 'to', otherId: of.id });
        choices.filter(c => c.on).forEach(c => links.push({ type: 'parent', newPersonIs: 'to', otherId: c.id }));
      } else if (of && relation === 'spouse') {
        links.push({ type: 'spouse', newPersonIs: 'from', otherId: of.id });
        choices.filter(c => c.on).forEach(c => links.push({ type: 'parent', newPersonIs: 'from', otherId: c.id }));
      }
      const created: Person = mutate(() => repo.addPerson(treeId, draft, links));
      navigation.popTo('Canvas', { treeId, focusId: created.id, focusNonce: Date.now() });
    } catch (e) {
      Alert.alert('Can’t save', e instanceof repo.RuleError ? e.message : String((e as Error).message ?? e));
    }
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      title,
      headerLeft: () => (
        <Pressable hitSlop={10} onPress={() => navigation.goBack()}>
          <ThemedText style={{ color: theme.accent }}>Cancel</ThemedText>
        </Pressable>
      ),
      headerRight: () => (
        <Pressable hitSlop={10} onPress={save} disabled={!name.trim()} accessibilityState={{ disabled: !name.trim() }}>
          <ThemedText type="headline" style={{ color: theme.accent, opacity: name.trim() ? 1 : 0.4 }}>
            Save
          </ThemedText>
        </Pressable>
      ),
    });
  });

  const pickPhoto = async () => {
    const pick = async () => {
      const res = await launchImageLibrary({ mediaType: 'photo', maxWidth: 1024, maxHeight: 1024, quality: 0.8 });
      const uri = res.assets?.[0]?.uri;
      if (uri) setPhotoPath(await importPhoto(uri));
    };
    if (!photoPath) return pick();
    showMenu(undefined, [
      { label: 'Choose another photo', onPress: pick },
      { label: 'Remove photo', destructive: true, onPress: () => setPhotoPath(undefined) },
    ]);
  };

  const inputStyle = [styles.input, { color: theme.text }];
  const divider = <View style={[styles.divider, { backgroundColor: theme.border }]} />;
  // Year problems show as you type; a missing name only after trying to save.
  const errorText = (msg: string | undefined, now = true) =>
    msg && (now || showErrors) ? (
      <ThemedText type="caption" style={[styles.error, { color: theme.danger }]}>
        ⚠ {msg}
      </ThemedText>
    ) : null;

  return (
    <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Pressable onPress={pickPhoto} style={styles.photo} accessibilityRole="button" accessibilityLabel="Add photo">
          <Avatar name={name || '+'} photoPath={photoPath} size={96} />
          <ThemedText type="subhead" style={{ color: theme.accent }}>
            {photoPath ? 'Change photo' : 'Add photo'}
          </ThemedText>
        </Pressable>

        <View style={[styles.group, { backgroundColor: theme.backgroundElement }]}>
          <Field label="Name">
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Full name"
              placeholderTextColor={theme.textSecondary}
              autoFocus={!editing}
              autoCapitalize="words"
              style={inputStyle}
            />
          </Field>
          {errorText(errors.name, false)}
          {divider}
          <Field label="Born">
            <TextInput
              value={born}
              onChangeText={setBorn}
              placeholder="Year, e.g. 1958 or c. 1040 BC"
              placeholderTextColor={theme.textSecondary}
              keyboardType="numbers-and-punctuation"
              style={inputStyle}
            />
          </Field>
          {errorText(errors.born)}
          {divider}
          <Field label="Died">
            <TextInput
              value={died}
              onChangeText={setDied}
              placeholder="Living or unknown"
              placeholderTextColor={theme.textSecondary}
              keyboardType="numbers-and-punctuation"
              style={inputStyle}
            />
          </Field>
          {errorText(errors.died)}
          {divider}
          <Field label="Sex">
            <View style={[styles.segment, { backgroundColor: theme.backgroundSelected }]}>
              {([['f', 'F'], ['m', 'M'], [undefined, '–']] as const).map(([value, label]) => {
                const on = sex === value;
                return (
                  <Pressable
                    key={label}
                    onPress={() => setSex(value)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: on }}
                    style={[styles.segmentItem, on && { backgroundColor: theme.backgroundElement }]}>
                    <ThemedText type={on ? 'headline' : 'body'}>{label}</ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </Field>
          {divider}
          <Field label="Origin">
            <TextInput
              value={origin}
              onChangeText={setOrigin}
              onFocus={() => setOriginOpen(true)}
              onBlur={() => setOriginOpen(false)}
              placeholder="Town, region or country"
              placeholderTextColor={theme.textSecondary}
              style={inputStyle}
            />
          </Field>
          {originOpen && suggestions.length ? (
            <View style={[styles.suggestions, { borderColor: theme.border }]}>
              {suggestions.map(s => (
                <Pressable
                  key={s}
                  onPress={() => {
                    setOrigin(s);
                    setOriginOpen(false);
                  }}
                  style={({ pressed }) => [styles.suggestion, pressed && { backgroundColor: theme.backgroundSelected }]}>
                  <ThemedText style={styles.check}>{s === origin ? '✓' : ''}</ThemedText>
                  <ThemedText numberOfLines={1}>{s}</ThemedText>
                </Pressable>
              ))}
            </View>
          ) : null}
          {divider}
          <Field label="Notes" top>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Anything worth remembering"
              placeholderTextColor={theme.textSecondary}
              multiline
              style={[inputStyle, styles.notes]}
            />
          </Field>
        </View>

        {choices.length ? (
          <View style={styles.choices}>
            <ThemedText type="section" style={styles.choicesTitle}>
              {choiceTitle}
            </ThemedText>
            <View style={[styles.group, { backgroundColor: theme.backgroundElement }]}>
              {choices.map((c, i) => (
                <View key={c.id}>
                  {i ? divider : null}
                  <Pressable
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: c.on }}
                    onPress={() => setChoices(cs => cs.map(x => (x.id === c.id ? { ...x, on: !x.on } : x)))}
                    style={styles.choice}>
                    <View style={[styles.box, { borderColor: c.on ? theme.accent : theme.border, backgroundColor: c.on ? theme.accent : 'transparent' }]}>
                      {c.on ? <ThemedText style={{ color: theme.accentText, fontSize: 14, lineHeight: 18 }}>✓</ThemedText> : null}
                    </View>
                    <ThemedText>{c.name}</ThemedText>
                  </Pressable>
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, children, top }: { label: string; children: React.ReactNode; top?: boolean }) {
  return (
    <View style={[styles.field, top && styles.fieldTop]}>
      <ThemedText style={styles.label} themeColor="textSecondary">
        {label}
      </ThemedText>
      <View style={styles.fieldBody}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { padding: Spacing.three, paddingBottom: 120 },
  photo: { alignItems: 'center', gap: Spacing.two, marginBottom: Spacing.four },
  group: { borderRadius: 12, overflow: 'hidden' },
  field: { flexDirection: 'row', alignItems: 'center', minHeight: 48, paddingHorizontal: Spacing.three },
  fieldTop: { alignItems: 'flex-start', paddingTop: 12 },
  label: { width: 72 },
  fieldBody: { flex: 1 },
  input: { fontSize: 17, paddingVertical: 12 },
  notes: { minHeight: 88, paddingTop: 0, textAlignVertical: 'top' },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: Spacing.three },
  error: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.two, marginLeft: 72 },
  segment: { flexDirection: 'row', borderRadius: 9, padding: 2, alignSelf: 'flex-start' },
  segmentItem: { minWidth: 52, minHeight: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 7 },
  suggestions: { borderTopWidth: StyleSheet.hairlineWidth, marginLeft: Spacing.three },
  suggestion: { flexDirection: 'row', alignItems: 'center', minHeight: 44, paddingRight: Spacing.three },
  check: { width: 24 },
  choices: { marginTop: Spacing.four },
  choicesTitle: { paddingHorizontal: Spacing.three, marginBottom: Spacing.two },
  choice: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48, paddingHorizontal: Spacing.three },
  box: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
});
