import { useState } from 'react';
import { View, TextInput, FlatList, Text, StyleSheet } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useSearch } from '@vspace/core/hooks';
import { useThemeColors } from '../../lib/theme';
import { ItemRow } from '../../components/ItemRow';
import { type, radii, spacing } from '@vspace/tokens';

/**
 * A dedicated tab, not a modal palette like web's Ctrl+K — a thumb reaches a
 * bottom tab far more easily than a keyboard shortcut it doesn't have.
 * Same `useSearch` hook, same zero-network guarantee: every keystroke here
 * queries the in-memory index, never Firestore.
 */
export default function SearchScreen() {
  const colors = useThemeColors();
  const [query, setQuery] = useState('');
  const { hits } = useSearch(query, { limit: 100 });

  return (
    <View style={[styles.flex, { backgroundColor: colors.bg }]}>
      <View style={styles.header}>
        <View style={[styles.inputRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Feather name="search" size={16} color={colors.textFaint} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search everything you've saved…"
            placeholderTextColor={colors.textFaint}
            autoCapitalize="none"
            style={[styles.input, { color: colors.text }]}
          />
        </View>
      </View>

      {hits.length === 0 && query.trim() ? (
        <View style={styles.empty}>
          <Text style={{ color: colors.textMuted, fontSize: type.bodySm.fontSize }}>
            Nothing found for &ldquo;{query}&rdquo;.
          </Text>
        </View>
      ) : (
        <FlatList
          data={hits}
          keyExtractor={(h) => h.item.id}
          renderItem={({ item }) => <ItemRow item={item.item} />}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          keyboardShouldPersistTaps="handled"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { padding: spacing.lg },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    height: 44,
  },
  input: { flex: 1, fontSize: type.body.fontSize },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
