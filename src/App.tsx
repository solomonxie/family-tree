import { DarkTheme, DefaultTheme, NavigationContainer, type LinkingOptions } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import { AppState, Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import {
  cleanupPhotos,
  flushRestorePoint,
  maybeSaveToICloud,
  restoreFromICloudIfFresh,
  scheduleRestorePoint,
} from '@/backup/backup';
import { showToast } from '@/components/toast';
import { ToastHost } from '@/components/toast';
import { subscribe } from '@/state/store';
import { Colors } from '@/constants/theme';
import { useScheme } from '@/hooks/use-theme';
import { RootNavigator } from '@/navigation/RootNavigator';
import type { RootStackParamList } from '@/navigation/types';
import { ensureSamplesLoaded } from '@/samples/load';
import { getDb } from '@/storage/db';

function openData(): string | undefined {
  try {
    getDb();
    ensureSamplesLoaded();
    return undefined;
  } catch (e) {
    return String((e as Error)?.message ?? e);
  }
}

const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['familytree://'],
  config: {
    screens: {
      Trees: 'trees',
      Canvas: 'tree/:treeId',
      PersonDetail: 'person/:personId',
      PersonForm: 'add/:treeId',
      Find: 'find/:treeId',
    },
  },
};

function Root() {
  const scheme = useScheme();
  const c = Colors[scheme];
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: { ...base.colors, primary: c.accent, background: c.background, card: c.backgroundElement, text: c.text, border: c.border },
  };
  useEffect(() => {
    const syncCloud = async () => {
      const restored = await restoreFromICloudIfFresh();
      if (restored) showToast(`Restored ${restored} ${restored === 1 ? 'tree' : 'trees'} from iCloud Drive`);
      await maybeSaveToICloud();
    };
    syncCloud().catch(() => {});
    cleanupPhotos().catch(() => {});
    const unsubscribe = subscribe(() => scheduleRestorePoint());
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') syncCloud().catch(() => {});
      if (state === 'background') flushRestorePoint().then(() => maybeSaveToICloud()).catch(() => {});
    });
    return () => {
      unsubscribe();
      sub.remove();
    };
  }, []);
  return (
    <NavigationContainer theme={navTheme} linking={linking}>
      <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} />
      <RootNavigator />
      <ToastHost />
    </NavigationContainer>
  );
}

export default function App() {
  const [error, setError] = useState(openData);
  return (
    <GestureHandlerRootView style={styles.fill}>
      <SafeAreaProvider>
        {error ? (
          <View style={[styles.fill, styles.center, { backgroundColor: Colors.light.background }]}>
            {/* Plain components: themed ones read settings from the DB that just failed. */}
            <Text style={styles.title}>⚠ Couldn’t open your data.</Text>
            <Text style={styles.msg}>{error}</Text>
            <Pressable onPress={() => setError(openData())} style={styles.retry}>
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          </View>
        ) : (
          <Root />
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  title: { fontSize: 17, fontWeight: '600', color: Colors.light.text },
  msg: { fontSize: 13, textAlign: 'center', color: Colors.light.textSecondary },
  retry: { paddingHorizontal: 18, paddingVertical: 12, borderRadius: 12, backgroundColor: Colors.light.accent },
  retryText: { fontSize: 17, fontWeight: '600', color: Colors.light.accentText },
});
