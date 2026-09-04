import { useEffect, useLayoutEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Image,
  ScrollView,
  Pressable,
  Linking,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  decryptSecret,
  deleteItem,
  ensureVaultUnlocked,
  formatDue,
  setPinned,
  setStatus,
  updateItem,
} from '@vspace/core';
import { useItem } from '@vspace/core/hooks';
import { useAuth } from '../../lib/auth-context';
import { useThemeColors } from '../../lib/theme';
import { KindGlyph } from '../../lib/kind-glyph';
import { triggerEnrichment } from '../../lib/enrich-client';
import { Button } from '../../components/Button';
import { type, radii, spacing } from '@vspace/tokens';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'ItemDetail'>;

/** The mobile counterpart to apps/web's `/item/[id]` page — same fields,
 *  same edit/pin/archive/delete/reveal behaviour. */
export default function ItemDetailScreen({ route, navigation }: Props) {
  const { id } = route.params;
  const { user, profile } = useAuth();
  const colors = useThemeColors();
  const item = useItem(id);

  const [title, setTitle] = useState(item?.title ?? '');
  const [description, setDescription] = useState(item?.description ?? '');
  const [revealed, setRevealed] = useState<string | null>(null);
  const [revealing, setRevealing] = useState(false);
  const [revealError, setRevealError] = useState<string | null>(null);

  // Syncs the editable fields to the live document whenever *title or
  // description specifically* change out from under the input (e.g. Ralph
  // replacing a placeholder title) — the same reasoning as the equivalent
  // effect on web's item detail page. Deliberately narrower than depending on
  // `item` itself: enrichment finishing mid-edit changes unrelated fields
  // (`enrichment`, `tags`, …) on every snapshot, and a broad `item` dependency
  // would re-fire this effect on those too, discarding whatever the user is
  // still typing into a field that didn't actually change.
  useEffect(() => {
    if (item) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTitle(item.title);
      setDescription(item.description);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.title, item?.description]);

  // Deliberately depends on `id`/`pinned` only, not the whole `item`, `user`,
  // `colors`, `navigation`, or `handleDelete` — all of those are either
  // stable across renders (the hook results, the function declared in this
  // component's own body) or would rebuild the header on every unrelated
  // field change (enrichment status, tags) if included, which is wasted work
  // this header never needs to react to.
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () =>
        item && user ? (
          <View style={styles.headerActions}>
            <Pressable onPress={() => setPinned(user.uid, item.id, !item.pinned)} hitSlop={8}>
              <Feather name="bookmark" size={18} color={item.pinned ? colors.text : colors.textMuted} />
            </Pressable>
            <Pressable onPress={() => setStatus(user.uid, item.id, 'archived')} hitSlop={8}>
              <Feather name="archive" size={18} color={colors.textMuted} />
            </Pressable>
            <Pressable onPress={handleDelete} hitSlop={8}>
              <Feather name="trash-2" size={18} color={colors.textMuted} />
            </Pressable>
          </View>
        ) : null,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id, item?.pinned]);

  if (!item) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator color={colors.textFaint} />
      </View>
    );
  }

  async function handleDelete() {
    if (!user) return;
    Alert.alert('Delete this item?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteItem(user.uid, id);
          navigation.goBack();
        },
      },
    ]);
  }

  async function reveal() {
    if (!user || !profile) return;
    setRevealing(true);
    setRevealError(null);
    try {
      const salt = await ensureVaultUnlocked(user.uid, profile.settings.vaultSalt, profile.settings.vaultCheck);
      if (!salt) return;
      setRevealed(await decryptSecret(item!.body, salt));
    } catch {
      setRevealError('Could not decrypt this secret on this device.');
    } finally {
      setRevealing(false);
    }
  }

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <View style={[styles.glyph, { backgroundColor: colors.surface }]}>
          <KindGlyph kind={item.kind} size={20} color={colors.textMuted} />
        </View>
        <View>
          <Text style={[styles.kindLabel, { color: colors.textFaint }]}>{item.kind.toUpperCase()}</Text>
          <Text style={[styles.dateLabel, { color: colors.textFaint }]}>
            {new Date(item.createdAt).toLocaleString()}
          </Text>
        </View>
      </View>

      <TextInput
        value={title}
        onChangeText={setTitle}
        onBlur={() => user && title.trim() && title !== item.title && updateItem(user.uid, item.id, { title })}
        style={[styles.title, { color: colors.text }]}
        multiline
      />

      {item.dueAt && (
        <View style={[styles.pill, { backgroundColor: colors.surface }]}>
          <Feather name="bell" size={13} color={colors.text} />
          <Text style={{ color: colors.text, fontSize: type.bodySm.fontSize }}>{formatDue(item.dueAt)}</Text>
        </View>
      )}

      {item.url && (
        <Pressable
          onPress={() => Linking.openURL(item.url!)}
          style={[styles.urlRow, { borderColor: colors.border, backgroundColor: colors.bgElevated }]}
        >
          <Feather name="external-link" size={15} color={colors.textMuted} />
          <Text numberOfLines={1} style={{ color: colors.text, fontSize: type.bodySm.fontSize, flex: 1 }}>
            {item.url}
          </Text>
        </Pressable>
      )}

      {item.media?.downloadUrl && (
        <Image source={{ uri: item.media.downloadUrl }} style={styles.image} resizeMode="cover" />
      )}

      <Text style={[styles.sectionLabel, { color: colors.textFaint }]}>DESCRIPTION</Text>
      {item.enrichment.state === 'pending' ? (
        <View style={styles.pendingRow}>
          <ActivityIndicator size="small" color={colors.textMuted} />
          <Text style={{ color: colors.textMuted, fontSize: type.bodySm.fontSize }}>
            Ralph is writing a description…
          </Text>
        </View>
      ) : item.enrichment.state === 'failed' ? (
        <View style={[styles.failedRow, { backgroundColor: colors.surface }]}>
          <Text style={{ color: colors.textMuted, fontSize: type.bodySm.fontSize }}>Enrichment failed</Text>
          <Button variant="outline" onPress={() => triggerEnrichment(item.id)}>
            Retry
          </Button>
        </View>
      ) : (
        <TextInput
          value={description}
          onChangeText={setDescription}
          onBlur={() =>
            user && description !== item.description && updateItem(user.uid, item.id, { description })
          }
          placeholder="No description yet — add one, or wait for Ralph."
          placeholderTextColor={colors.textFaint}
          multiline
          style={[styles.description, { backgroundColor: colors.surface, color: colors.text }]}
        />
      )}

      {item.encrypted ? (
        <View>
          <Text style={[styles.sectionLabel, { color: colors.textFaint }]}>SECRET</Text>
          {revealed ? (
            <View style={[styles.secretRow, { backgroundColor: colors.surface }]}>
              <Text numberOfLines={1} style={[styles.secretText, { color: colors.text }]}>
                {revealed}
              </Text>
              <Button variant="outline" onPress={() => setRevealed(null)}>
                Hide
              </Button>
            </View>
          ) : (
            <View style={[styles.secretRow, { borderColor: colors.borderStrong, borderWidth: 1, borderStyle: 'dashed' }]}>
              <View style={styles.secretLocked}>
                <Feather name="lock" size={15} color={colors.textMuted} />
                <Text style={{ color: colors.textMuted, fontSize: type.bodySm.fontSize }}>Encrypted on this device</Text>
              </View>
              <Button loading={revealing} onPress={reveal}>
                Reveal
              </Button>
            </View>
          )}
          {revealError && <Text style={{ color: colors.overdue, fontSize: type.bodySm.fontSize, marginTop: 6 }}>{revealError}</Text>}
        </View>
      ) : (
        item.body && (
          <View>
            <Text style={[styles.sectionLabel, { color: colors.textFaint }]}>CONTENT</Text>
            <View style={[styles.bodyBox, { backgroundColor: colors.surface }]}>
              <Text style={{ color: colors.text, fontFamily: 'monospace', fontSize: type.code.fontSize }}>
                {item.body}
              </Text>
            </View>
          </View>
        )
      )}

      {item.tags.length > 0 && (
        <View style={styles.tagsRow}>
          {item.tags.map((tag) => (
            <View key={tag} style={[styles.tag, { backgroundColor: colors.surface }]}>
              <Text style={{ color: colors.textMuted, fontSize: type.bodySm.fontSize }}>#{tag}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: spacing.lg, gap: spacing.md },
  headerActions: { flexDirection: 'row', gap: spacing.lg, marginRight: spacing.sm },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  glyph: { width: 44, height: 44, borderRadius: radii.lg, alignItems: 'center', justifyContent: 'center' },
  kindLabel: { fontSize: type.micro.fontSize, fontWeight: '700', letterSpacing: 0.5 },
  dateLabel: { fontSize: type.micro.fontSize, marginTop: 2 },
  title: { fontSize: type.title.fontSize, fontWeight: '800' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  urlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.md,
  },
  image: { width: '100%', height: 220, borderRadius: radii.lg },
  sectionLabel: { fontSize: type.eyebrow.fontSize, fontWeight: '800', letterSpacing: 1, marginBottom: 6 },
  pendingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  failedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radii.md,
    padding: spacing.md,
  },
  description: { borderRadius: radii.md, padding: spacing.md, fontSize: type.bodySm.fontSize, minHeight: 60 },
  bodyBox: { borderRadius: radii.md, padding: spacing.md },
  secretRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  secretText: { flex: 1, fontFamily: 'monospace' },
  secretLocked: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tag: { borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: 6 },
});
