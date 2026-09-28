import { ActionSheetIOS, Alert, Platform } from 'react-native';

export interface MenuItem {
  label: string;
  onPress: () => void;
  destructive?: boolean;
}

export function showMenu(title: string | undefined, items: MenuItem[]) {
  if (Platform.OS === 'ios') {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title,
        options: [...items.map(i => i.label), 'Cancel'],
        cancelButtonIndex: items.length,
        destructiveButtonIndex: items.flatMap((i, n) => (i.destructive ? [n] : [])),
      },
      index => items[index]?.onPress(),
    );
    return;
  }
  Alert.alert(title ?? '', undefined, [
    ...items.map(i => ({ text: i.label, onPress: i.onPress, style: i.destructive ? ('destructive' as const) : undefined })),
    { text: 'Cancel', style: 'cancel' as const },
  ]);
}

export function confirm(title: string, message: string, action: string, onConfirm: () => void, destructive = true) {
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: action, style: destructive ? 'destructive' : 'default', onPress: onConfirm },
  ]);
}
