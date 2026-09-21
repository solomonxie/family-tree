import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useColorScheme } from 'react-native';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="tree/[id]" options={{ title: 'Tree' }} />
        <Stack.Screen name="person/[id]" options={{ title: 'Person' }} />
        <Stack.Screen name="person/add" options={{ title: 'Add Person', presentation: 'modal' }} />
      </Stack>
    </ThemeProvider>
  );
}
