import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, StyleSheet, TextInput, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Button } from './button';
import { ThemedText } from './themed-text';

export interface PromptSpec {
  title: string;
  placeholder?: string;
  initial?: string;
  action: string;
  onSubmit: (value: string) => void;
}

export function PromptModal({ spec, onClose }: { spec?: PromptSpec; onClose: () => void }) {
  const theme = useTheme();
  const [value, setValue] = useState('');
  useEffect(() => setValue(spec?.initial ?? ''), [spec]);
  const submit = () => {
    if (!value.trim() || !spec) return;
    spec.onSubmit(value.trim());
    onClose();
  };
  return (
    <Modal transparent visible={!!spec} animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[styles.scrim, { backgroundColor: theme.scrim }]}>
        <View style={[styles.box, { backgroundColor: theme.backgroundElement }]}>
          <ThemedText type="headline">{spec?.title}</ThemedText>
          <TextInput
            autoFocus
            value={value}
            onChangeText={setValue}
            placeholder={spec?.placeholder}
            placeholderTextColor={theme.textSecondary}
            onSubmitEditing={submit}
            returnKeyType="done"
            selectTextOnFocus
            style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
          />
          <View style={styles.actions}>
            <Button kind="text" title="Cancel" onPress={onClose} />
            <Button kind="primary" title={spec?.action ?? 'OK'} onPress={submit} disabled={!value.trim()} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, justifyContent: 'center', padding: Spacing.four },
  box: { borderRadius: 16, padding: Spacing.three + 4, gap: Spacing.three },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 17 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.two },
});
