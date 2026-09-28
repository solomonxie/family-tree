import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { CanvasScreen } from '@/screens/CanvasScreen';
import { FindScreen } from '@/screens/FindScreen';
import { PersonDetailScreen } from '@/screens/PersonDetailScreen';
import { PersonFormScreen } from '@/screens/PersonFormScreen';
import { TreesScreen } from '@/screens/TreesScreen';
import { useTheme } from '@/hooks/use-theme';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const theme = useTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerTintColor: theme.accent,
        headerStyle: { backgroundColor: theme.background },
        headerTitleStyle: { color: theme.text },
        contentStyle: { backgroundColor: theme.background },
        headerShadowVisible: false,
      }}>
      <Stack.Screen name="Trees" component={TreesScreen} options={{ headerShown: false, title: 'Trees' }} />
      <Stack.Screen name="Canvas" component={CanvasScreen} options={{ title: '' }} />
      <Stack.Screen name="PersonDetail" component={PersonDetailScreen} options={{ title: '' }} />
      <Stack.Screen name="PersonForm" component={PersonFormScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen
        name="Find"
        component={FindScreen}
        options={{ presentation: 'formSheet', sheetAllowedDetents: [0.9], sheetGrabberVisible: true, headerShown: false }}
      />
    </Stack.Navigator>
  );
}
