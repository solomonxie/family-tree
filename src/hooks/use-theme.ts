import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';
import { useSetting } from '@/state/store';

export type Appearance = 'auto' | 'light' | 'dark';

export function useScheme(): 'light' | 'dark' {
  const system = useColorScheme();
  const appearance = useSetting('appearance', 'auto') as Appearance;
  if (appearance !== 'auto') return appearance;
  return system === 'dark' ? 'dark' : 'light';
}

export function useTheme() {
  return Colors[useScheme()];
}
