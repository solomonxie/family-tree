import { useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function AddPersonScreen() {
  const theme = useTheme();
  const [name, setName] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [deathYear, setDeathYear] = useState('');
  const [originRegion, setOriginRegion] = useState('');

  const handleSave = () => {
    Alert.alert('Not saved', 'Adding people is not wired to storage yet.');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
        <ThemedView type="backgroundElement" style={styles.photoPlaceholder}>
          <ThemedText type="small" themeColor="textSecondary">
            + Photo
          </ThemedText>
        </ThemedView>

        <LabeledInput label="Name" value={name} onChangeText={setName} />
        <LabeledInput label="Birth year" value={birthYear} onChangeText={setBirthYear} keyboardType="number-pad" />
        <LabeledInput label="Death year" value={deathYear} onChangeText={setDeathYear} keyboardType="number-pad" />
        <LabeledInput label="Origin / region" value={originRegion} onChangeText={setOriginRegion} />

        <Pressable
          onPress={handleSave}
          style={({ pressed }) => [styles.saveButton, { backgroundColor: theme.backgroundElement }, pressed && styles.pressed]}>
          <ThemedText type="linkPrimary">Save</ThemedText>
        </Pressable>
      </ThemedView>
    </SafeAreaView>
  );
}

function LabeledInput({
  label,
  value,
  onChangeText,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  keyboardType?: 'default' | 'number-pad';
}) {
  const theme = useTheme();
  return (
    <ThemedView style={styles.field}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        placeholder={label}
        placeholderTextColor={theme.textSecondary}
        style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    gap: Spacing.three,
  },
  photoPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  field: {
    alignSelf: 'stretch',
    gap: Spacing.one,
  },
  input: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  saveButton: {
    alignSelf: 'stretch',
    alignItems: 'center',
    borderRadius: Spacing.three,
    paddingVertical: Spacing.three,
    marginTop: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
});
