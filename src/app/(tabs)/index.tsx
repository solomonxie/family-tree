import { router } from 'expo-router';
import { Alert, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

const TREES = [
  { id: 'my-family', title: 'My Family', subtitle: '6 people' },
  { id: 'historical-adam-jesus', title: 'Historical: Adam to Jesus', subtitle: 'Biblical lineage' },
];

export default function TreesScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
        <ThemedText type="title" style={styles.title}>
          Trees
        </ThemedText>

        {TREES.map((tree) => (
          <Pressable
            key={tree.id}
            onPress={() => router.push(`/tree/${tree.id}`)}
            style={({ pressed }) => pressed && styles.pressed}>
            <ThemedView type="backgroundElement" style={styles.row}>
              <ThemedText type="default">{tree.title}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {tree.subtitle}
              </ThemedText>
            </ThemedView>
          </Pressable>
        ))}

        <Pressable
          onPress={() => Alert.alert('Add tree', 'Creating new trees is coming soon.')}
          style={({ pressed }) => pressed && styles.pressed}>
          <ThemedView type="backgroundElement" style={styles.row}>
            <ThemedText type="linkPrimary">+ Add tree</ThemedText>
          </ThemedView>
        </Pressable>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    gap: Spacing.three,
  },
  title: {
    marginBottom: Spacing.two,
  },
  row: {
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    gap: Spacing.half,
  },
  pressed: {
    opacity: 0.7,
  },
});
