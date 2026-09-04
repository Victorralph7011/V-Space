import { useState } from 'react';
import { View, Text, FlatList, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SECTIONS, completeReminder, reopenReminder, type Item } from '@vspace/core';
import { useReminders, useSection } from '@vspace/core/hooks';
import { useAuth } from '../../lib/auth-context';
import { useThemeColors } from '../../lib/theme';
import { ItemRow } from '../../components/ItemRow';
import { KindGlyph } from '../../lib/kind-glyph';
import Feather from '@expo/vector-icons/Feather';
import { type, radii, spacing } from '@vspace/tokens';

/**
 * The Library tab. Bottom tabs on mobile are Chat · Library · Search · Me —
 * one tab, not five — so this is where the plan's five sections live as a
 * segmented control over one screen, the direct mobile equivalent of the
 * web app's five separate `/prompts`, `/links`, … routes. Same
 * `SECTIONS` config from @vspace/core drives both.
 */
export default function LibraryScreen() {
  const colors = useThemeColors();
  const [slug, setSlug] = useState(SECTIONS[0]!.slug);
  const section = SECTIONS.find((s) => s.slug === slug)!;

  return (
    <View style={[styles.flex, { backgroundColor: colors.bg }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabs}
        style={[styles.tabsRow, { borderColor: colors.border }]}
      >
        {SECTIONS.map((s) => {
          const active = s.slug === slug;
          return (
            <Pressable
              key={s.slug}
              onPress={() => setSlug(s.slug)}
              style={[
                styles.tab,
                { backgroundColor: active ? colors.accent : colors.surface },
              ]}
            >
              <KindGlyph kind={s.kinds[0]!} size={14} color={active ? colors.textInverse : colors.textMuted} />
              <Text style={{ color: active ? colors.textInverse : colors.textMuted, fontWeight: '700', fontSize: type.bodySm.fontSize }}>
                {s.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {slug === 'reminders' ? <RemindersList /> : <SectionList slug={slug} title={section.label} emptyTitle={section.emptyTitle} emptyBody={section.emptyBody} />}
    </View>
  );
}

function SectionList({
  slug,
  emptyTitle,
  emptyBody,
}: {
  slug: string;
  title: string;
  emptyTitle: string;
  emptyBody: string;
}) {
  const colors = useThemeColors();
  const { items } = useSection(slug);

  if (items.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>{emptyTitle}</Text>
        <Text style={[styles.emptyBody, { color: colors.textMuted }]}>{emptyBody}</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={items}
      keyExtractor={(i) => i.id}
      renderItem={({ item }) => <ItemRow item={item} />}
      contentContainerStyle={styles.list}
      ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
    />
  );
}

/** Reminders needs the Overdue/Today/Upcoming/Done grouping the plain
 *  `SectionList` above can't express — the mobile equivalent of the web
 *  app's dedicated `/reminders` page, same `useReminders` hook. */
function RemindersList() {
  const colors = useThemeColors();
  const { user } = useAuth();
  const buckets = useReminders();
  const total = buckets.overdue.length + buckets.today.length + buckets.upcoming.length + buckets.done.length;

  if (total === 0) {
    return (
      <View style={styles.empty}>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>Nothing due</Text>
        <Text style={[styles.emptyBody, { color: colors.textMuted }]}>
          Type &ldquo;submit DBMS assignment friday 6pm&rdquo; and the date is picked up for you.
        </Text>
      </View>
    );
  }

  const sections: { label: string; items: Item[]; done?: boolean }[] = [
    { label: 'Overdue', items: buckets.overdue },
    { label: 'Today', items: buckets.today },
    { label: 'Upcoming', items: buckets.upcoming },
    { label: 'Done', items: buckets.done, done: true },
  ].filter((s) => s.items.length > 0);

  return (
    <FlatList
      data={sections}
      keyExtractor={(s) => s.label}
      contentContainerStyle={styles.list}
      renderItem={({ item: section }) => (
        <View style={{ marginBottom: spacing.lg }}>
          <Text style={[styles.bucketLabel, { color: section.label === 'Overdue' ? colors.overdue : colors.textFaint }]}>
            {section.label.toUpperCase()} · {section.items.length}
          </Text>
          <View style={{ gap: spacing.sm }}>
            {section.items.map((item) => (
              <View key={item.id} style={styles.reminderRow}>
                <View style={{ flex: 1 }}>
                  <ItemRow item={item} />
                </View>
                {user && (
                  <Pressable
                    onPress={() =>
                      section.done ? reopenReminder(user.uid, item.id) : completeReminder(user.uid, item.id)
                    }
                    style={[styles.checkButton, { borderColor: colors.borderStrong }]}
                  >
                    <Feather name="check" size={16} color={section.done ? colors.textFaint : colors.text} />
                  </Pressable>
                )}
              </View>
            ))}
          </View>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  tabsRow: { borderBottomWidth: 1 },
  tabs: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
  },
  list: { padding: spacing.lg },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.huge },
  emptyTitle: { fontSize: type.subheading.fontSize, fontWeight: '700', marginBottom: 6, textAlign: 'center' },
  emptyBody: { fontSize: type.bodySm.fontSize, textAlign: 'center', maxWidth: 280 },
  bucketLabel: { fontSize: type.eyebrow.fontSize, fontWeight: '800', letterSpacing: 1, marginBottom: spacing.sm },
  reminderRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  checkButton: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
