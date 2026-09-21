import { useLocalSearchParams } from 'expo-router';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { mockPersons } from '@/data/mockFamily';

export default function PersonDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const person = mockPersons.find((p) => p.id === id);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
        <ThemedView type="backgroundElement" style={styles.photoPlaceholder}>
          <ThemedText type="small" themeColor="textSecondary">
            Photo
          </ThemedText>
        </ThemedView>

        <ThemedText type="title" style={styles.name}>
          {person?.name ?? 'Unknown person'}
        </ThemedText>

        <Field label="Born" value={person?.birthYear ? String(person.birthYear) : '—'} />
        <Field label="Died" value={person?.deathYear ? String(person.deathYear) : '—'} />
        <Field label="Origin / region" value={person?.originRegion ?? '—'} />
      </ThemedView>
    </SafeAreaView>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <ThemedView type="backgroundElement" style={styles.field}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="default">{value}</ThemedText>
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
  name: {
    fontSize: 28,
    lineHeight: 32,
  },
  field: {
    alignSelf: 'stretch',
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    gap: Spacing.half,
  },
});
