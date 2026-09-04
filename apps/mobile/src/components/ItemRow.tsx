import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Feather from '@expo/vector-icons/Feather';
import type { Item } from '@vspace/core';
import { useThemeColors } from '../lib/theme';
import { KindGlyph } from '../lib/kind-glyph';
import { type, radii, spacing } from '@vspace/tokens';
import type { RootStackParamList } from '../navigation/types';

/** One row in a section list or search results — the mobile counterpart to
 *  apps/web's `<ItemCard>`. Same branching logic, same fields shown. */
export function ItemRow({ item }: { item: Item }) {
  const colors = useThemeColors();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const pending = item.enrichment.state === 'pending';

  return (
    <Pressable
      onPress={() => navigation.navigate('ItemDetail', { id: item.id })}
      style={[styles.row, { backgroundColor: colors.bgElevated, borderColor: colors.border }]}
    >
      {item.media?.downloadUrl ? (
        <Image source={{ uri: item.media.thumbUrl ?? item.media.downloadUrl }} style={styles.thumb} />
      ) : (
        <View style={[styles.thumb, styles.thumbPlaceholder, { backgroundColor: colors.surface }]}>
          <KindGlyph kind={item.kind} color={colors.textMuted} />
        </View>
      )}

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text numberOfLines={1} style={[styles.title, { color: colors.text }]}>
            {item.title}
          </Text>
          {item.pinned && <Feather name="bookmark" size={13} color={colors.textFaint} />}
        </View>

        <Text numberOfLines={2} style={[styles.desc, { color: colors.textMuted }]}>
          {item.encrypted
            ? 'Encrypted — unlock to view'
            : pending
              ? 'Ralph is writing a description…'
              : item.description || item.body || 'No description yet'}
        </Text>

        <View style={styles.metaRow}>
          {item.tags.slice(0, 3).map((tag) => (
            <View key={tag} style={[styles.tag, { backgroundColor: colors.surface }]}>
              <Text style={{ color: colors.textMuted, fontSize: type.micro.fontSize }}>#{tag}</Text>
            </View>
          ))}
          <Text style={[styles.date, { color: colors.textFaint }]}>{relativeDate(item.createdAt)}</Text>
        </View>
      </View>
    </Pressable>
  );
}

function relativeDate(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.md,
  },
  thumb: { width: 56, height: 56, borderRadius: radii.md },
  thumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, minWidth: 0 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  title: { fontSize: type.subheading.fontSize, fontWeight: '700', flexShrink: 1 },
  desc: { fontSize: type.bodySm.fontSize, marginTop: 3 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.sm, flexWrap: 'wrap' },
  tag: { borderRadius: radii.pill, paddingHorizontal: 8, paddingVertical: 2 },
  date: { fontSize: type.micro.fontSize, marginLeft: 'auto' },
});
