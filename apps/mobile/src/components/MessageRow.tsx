import { View, Text, Image, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { Message } from '@vspace/core';
import { useItem } from '@vspace/core/hooks';
import { useThemeColors } from '../lib/theme';
import { KindGlyph } from '../lib/kind-glyph';
import { type, radii, spacing } from '@vspace/tokens';
import type { RootStackParamList } from '../navigation/types';

/**
 * One line in the chat — the mobile counterpart to apps/web's
 * `<MessageBubble>`. Same idea: a `role: 'ralph'` message links straight to
 * the item it produced, and the linked card re-renders live off `useItem` as
 * enrichment lands, without the message itself ever needing to change.
 */
export function MessageRow({ message }: { message: Message }) {
  const colors = useThemeColors();
  const item = useItem(message.itemId);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const isUser = message.role === 'user';

  // An attached photo is linked to the user's own message (see ChatScreen's
  // handleAttach) specifically so it can render as an actual image here —
  // like any normal chat app's photo attachment — rather than a text bubble
  // naming the file.
  const isPendingPhoto = isUser && item?.kind === 'image' && !item.media?.downloadUrl;
  const isPhotoAttachment = isUser && item?.kind === 'image' && !!item.media?.downloadUrl;

  return (
    <View
      style={[
        styles.row,
        { alignSelf: isUser ? 'flex-end' : 'flex-start', alignItems: isUser ? 'flex-end' : 'flex-start' },
      ]}
    >
      {isPhotoAttachment ? (
        <Pressable onPress={() => navigation.navigate('ItemDetail', { id: item.id })}>
          <Image source={{ uri: item.media!.downloadUrl }} style={styles.photo} resizeMode="cover" />
        </Pressable>
      ) : isPendingPhoto ? (
        // No `media` yet: either the upload is still in flight, or it failed
        // (see captureImage's try/catch) — an honest status line instead of
        // the blank bubble an empty message.text would otherwise leave.
        <View style={[styles.bubble, styles.statusBubble, { backgroundColor: colors.accent }]}>
          {item.enrichment.state === 'failed' ? (
            <Feather name="alert-circle" size={15} color={colors.textInverse} />
          ) : (
            <ActivityIndicator size="small" color={colors.textInverse} />
          )}
          <Text style={{ color: colors.textInverse, fontSize: type.body.fontSize }}>
            {item.enrichment.state === 'failed' ? 'Photo failed to upload' : 'Uploading photo…'}
          </Text>
        </View>
      ) : (
        message.text.length > 0 && (
          <View
            style={[
              styles.bubble,
              isUser
                ? { backgroundColor: colors.accent, borderBottomRightRadius: 6 }
                : { backgroundColor: colors.surface, borderBottomLeftRadius: 6 },
            ]}
          >
            <Text style={{ color: isUser ? colors.textInverse : colors.text, fontSize: type.body.fontSize }}>
              {message.text}
            </Text>
          </View>
        )
      )}

      {!isUser && item && (
        <Pressable
          onPress={() => navigation.navigate('ItemDetail', { id: item.id })}
          style={[styles.card, { backgroundColor: colors.bgElevated, borderColor: colors.border }]}
        >
          <View style={[styles.glyph, { backgroundColor: colors.surface }]}>
            {item.enrichment.state === 'pending' ? (
              <ActivityIndicator size="small" color={colors.textMuted} />
            ) : item.media?.thumbUrl || item.media?.downloadUrl ? (
              <Image
                source={{ uri: item.media.thumbUrl ?? item.media.downloadUrl }}
                style={styles.glyphImage}
                resizeMode="cover"
              />
            ) : (
              <KindGlyph kind={item.kind} size={16} color={colors.textMuted} />
            )}
          </View>
          <View style={styles.cardText}>
            <Text numberOfLines={1} style={{ color: colors.text, fontWeight: '700', fontSize: type.bodySm.fontSize }}>
              {item.title}
            </Text>
            <Text numberOfLines={1} style={{ color: colors.textMuted, fontSize: type.micro.fontSize }}>
              {item.enrichment.state === 'pending'
                ? 'Ralph is writing a description…'
                : item.description || item.url || 'Tap to open'}
            </Text>
          </View>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { marginBottom: spacing.sm, maxWidth: '85%' },
  bubble: { borderRadius: radii.xl, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  statusBubble: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderBottomRightRadius: 6 },
  photo: { width: 220, height: 220, borderRadius: radii.xl, borderBottomRightRadius: 6 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginTop: spacing.sm,
    width: '100%',
  },
  glyph: { width: 32, height: 32, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  glyphImage: { width: 32, height: 32 },
  cardText: { flex: 1, minWidth: 0 },
});
