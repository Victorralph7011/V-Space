import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import * as ImagePicker from 'expo-image-picker';
import { appendCaptureReply, appendMessage, captureAnyText, captureImage } from '@vspace/core';
import { useMessages } from '@vspace/core/hooks';
import { useAuth } from '../../lib/auth-context';
import { useThemeColors } from '../../lib/theme';
import { MessageRow } from '../../components/MessageRow';
import { triggerEnrichment } from '../../lib/enrich-client';
import { spacing, radii, type } from '@vspace/tokens';

/**
 * The default tab. The mobile counterpart to apps/web's chat page — same
 * pipeline (`captureAnyText` → filed instantly → `triggerEnrichment` fired
 * and forgotten), same "Saved to Links Space" reply pattern, adapted to
 * `FlatList` + a native keyboard-avoiding composer.
 */
export default function ChatScreen() {
  const { user, profile } = useAuth();
  const colors = useThemeColors();
  const { messages, loaded } = useMessages(user?.uid ?? null);
  const [text, setText] = useState('');
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    if (messages.length) requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  }, [messages.length]);

  async function handleSend() {
    const trimmed = text.trim();
    if (!trimmed || !user || !profile) return;
    setText('');

    await appendMessage(user.uid, 'user', trimmed);
    const item = await captureAnyText(user.uid, trimmed, profile);
    if (!item) {
      await appendMessage(user.uid, 'ralph', "Not saved — the vault wasn't unlocked.");
      return;
    }
    await appendCaptureReply(user.uid, item);
    void triggerEnrichment(item.id);
  }

  async function handleAttach() {
    if (!user) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    const response = await fetch(asset.uri);
    const blob = await response.blob();
    const fileName = asset.fileName ?? `photo-${Date.now()}.jpg`;

    // Captured before the user's own message is appended, and specifically
    // linked to it, so the bubble can render the actual photo instead of a
    // text line naming the file.
    const item = await captureImage(user.uid, blob, fileName);
    await appendMessage(user.uid, 'user', '', item.id);
    await appendCaptureReply(user.uid, item);
    void triggerEnrichment(item.id);
  }

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {loaded && messages.length === 0 ? (
        <View style={styles.empty}>
          <View style={[styles.emptyGlyph, { backgroundColor: colors.surface }]}>
            <Feather name="message-square" size={22} color={colors.textFaint} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>This is your space</Text>
          <Text style={[styles.emptyBody, { color: colors.textMuted }]}>
            Paste a reel, a prompt, an idea, or &ldquo;submit assignment friday 6pm&rdquo; — it gets filed and
            described automatically.
          </Text>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={({ item }) => <MessageRow message={item} />}
          contentContainerStyle={styles.list}
        />
      )}

      <View style={[styles.composer, { borderColor: colors.border, backgroundColor: colors.bgElevated }]}>
        <View style={[styles.inputRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Pressable onPress={handleAttach} hitSlop={8}>
            <Feather name="paperclip" size={19} color={colors.textMuted} />
          </Pressable>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Paste a link, a prompt, an idea, or a date…"
            placeholderTextColor={colors.textFaint}
            multiline
            style={[styles.input, { color: colors.text }]}
          />
          <Pressable
            onPress={handleSend}
            disabled={!text.trim()}
            style={[styles.send, { backgroundColor: colors.accent, opacity: text.trim() ? 1 : 0.4 }]}
          >
            <Feather name="send" size={16} color={colors.textInverse} />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { padding: spacing.lg, gap: spacing.sm },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.huge },
  emptyGlyph: {
    width: 48,
    height: 48,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: { fontSize: type.subheading.fontSize, fontWeight: '700', marginBottom: 6 },
  emptyBody: { fontSize: type.bodySm.fontSize, textAlign: 'center', maxWidth: 280 },
  composer: { borderTopWidth: 1, padding: spacing.sm },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radii.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  input: { flex: 1, fontSize: type.body.fontSize, maxHeight: 120, paddingTop: 4 },
  send: { width: 34, height: 34, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center' },
});
