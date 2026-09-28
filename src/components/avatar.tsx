import { Image, StyleSheet, View } from 'react-native';

import { initials } from '@/domain/format';
import { useTheme } from '@/hooks/use-theme';
import { photoUri } from '@/storage/photos';
import { ThemedText } from './themed-text';

export function Avatar({ name, photoPath, size = 44, tint }: { name: string; photoPath?: string; size?: number; tint?: string }) {
  const theme = useTheme();
  const uri = photoUri(photoPath);
  const box = { width: size, height: size, borderRadius: size / 2 };
  if (uri) return <Image source={{ uri }} style={[box, styles.border, { borderColor: theme.border }]} />;
  return (
    <View style={[box, styles.center, { backgroundColor: tint ?? theme.backgroundSelected }]}>
      <ThemedText type={size > 60 ? 'title' : 'headline'} style={{ fontSize: size * 0.38 }}>
        {initials(name)}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  border: { borderWidth: StyleSheet.hairlineWidth },
});
