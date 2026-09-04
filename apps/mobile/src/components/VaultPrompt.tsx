import { useEffect, useState } from 'react';
import { Modal, View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { subscribeVaultPrompt, resolvePassphrase, type PendingVaultPrompt } from '@vspace/core';
import { useThemeColors } from '../lib/theme';
import { type, spacing, radii } from '@vspace/tokens';

/**
 * The mobile counterpart to apps/web's `<VaultModal>` — same bridge
 * (`@vspace/core`'s `prompt-bridge.ts`), same two modes, native `Modal` +
 * `TextInput` instead of a web dialog. Rendered once at the navigation root.
 */
export function VaultPrompt() {
  const colors = useThemeColors();
  const [request, setRequest] = useState<PendingVaultPrompt | null>(null);
  const [value, setValue] = useState('');

  useEffect(() => subscribeVaultPrompt(setRequest), []);
  useEffect(() => {
    // Clearing the field when a new prompt arrives (not on every render) is
    // the trigger this effect exists for; there's no render-time value to
    // derive it from since `request` comes from an external subscription.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (request) setValue('');
  }, [request]);

  if (!request) return null;

  function submit() {
    if (!value) return;
    resolvePassphrase(value);
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => resolvePassphrase(null)}>
      <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
        <View style={[styles.card, { backgroundColor: colors.bgElevated, borderColor: colors.border }]}>
          <View style={[styles.badge, { backgroundColor: colors.surface }]}>
            <Text style={{ color: colors.textMuted, fontSize: 20 }}>🔒</Text>
          </View>

          <Text style={[styles.title, { color: colors.text }]}>
            {request.mode === 'create' ? 'Create a vault passphrase' : 'Unlock your vault'}
          </Text>

          <Text style={[styles.body, { color: colors.textMuted }]}>
            {request.mode === 'create'
              ? "This encrypts API keys and other secrets on your device. There is no recovery — if you forget it, whatever's encrypted with it is gone for good."
              : 'Enter your passphrase to view this secret.'}
          </Text>

          <TextInput
            value={value}
            onChangeText={setValue}
            onSubmitEditing={submit}
            secureTextEntry
            autoFocus
            placeholder="Passphrase"
            placeholderTextColor={colors.textFaint}
            style={[
              styles.input,
              { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text },
            ]}
          />

          {request.error && <Text style={[styles.error, { color: colors.overdue }]}>{request.error}</Text>}

          <View style={styles.row}>
            <Pressable
              onPress={() => resolvePassphrase(null)}
              style={[styles.button, styles.outline, { borderColor: colors.borderStrong }]}
            >
              <Text style={{ color: colors.text, fontWeight: '700' }}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={submit}
              disabled={!value}
              style={[styles.button, { backgroundColor: colors.accent, opacity: value ? 1 : 0.45 }]}
            >
              <Text style={{ color: colors.textInverse, fontWeight: '700' }}>
                {request.mode === 'create' ? 'Create' : 'Unlock'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  card: { width: '100%', maxWidth: 360, borderRadius: radii.xl, borderWidth: 1, padding: spacing.xxl },
  badge: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: { fontSize: type.heading.fontSize, fontWeight: '700' },
  body: { fontSize: type.bodySm.fontSize, marginTop: spacing.sm, lineHeight: type.bodySm.lineHeight },
  input: {
    height: 44,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
    fontSize: type.body.fontSize,
  },
  error: { fontSize: type.bodySm.fontSize, marginTop: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xl },
  button: { flex: 1, height: 44, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  outline: { borderWidth: 1 },
});
