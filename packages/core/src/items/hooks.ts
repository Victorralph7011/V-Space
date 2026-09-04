import { useMemo, useSyncExternalStore } from 'react';

import { itemStore, type ItemsState } from './store.ts';
import type { SearchHit, SearchOptions } from '../search/index.ts';
import { SECTIONS, sectionBySlug } from '../types/sections.ts';
import type { ID, Item, ItemKind } from '../types/index.ts';

/**
 * Read-side hooks over the single item stream.
 *
 * Every one of these derives from the same in-memory snapshot, so a section
 * page, the search box, and the reminder badge all render from one listener and
 * always agree with each other. No hook here issues a query.
 */

export function useItemsState(): ItemsState {
  return useSyncExternalStore(itemStore.subscribe, itemStore.getSnapshot, itemStore.getSnapshot);
}

export function useItems(): readonly Item[] {
  return useItemsState().items;
}

export function useItem(id: ID | null | undefined): Item | null {
  const { byId } = useItemsState();
  return id ? (byId.get(id) ?? null) : null;
}

/**
 * The items belonging to one section, newest first, pinned to the top.
 *
 * Pinning is applied here rather than in the Firestore query because it would
 * otherwise need its own composite index on every section, and sorting a few
 * hundred already-in-memory objects costs nothing.
 */
export function useSection(slug: string, options: { includeDone?: boolean } = {}): {
  items: Item[];
  loaded: boolean;
} {
  const { items, loaded } = useItemsState();
  const includeDone = options.includeDone ?? false;

  const filtered = useMemo(() => {
    const section = sectionBySlug(slug);
    if (!section) return [];
    const kinds = new Set(section.kinds);

    return items
      .filter((item) => {
        if (!kinds.has(item.kind)) return false;
        if (item.status === 'archived') return false;
        if (!includeDone && item.status === 'done') return false;
        return true;
      })
      .sort(pinnedFirst);
  }, [items, slug, includeDone]);

  return { items: filtered, loaded };
}

export function useItemsByKind(kinds: readonly ItemKind[]): Item[] {
  const { items } = useItemsState();
  return useMemo(() => {
    const set = new Set(kinds);
    return items.filter((i) => set.has(i.kind) && i.status !== 'archived').sort(pinnedFirst);
  }, [items, kinds]);
}

/**
 * Search. Runs synchronously against the in-memory index on every keystroke —
 * there is no debounce here because there is nothing to debounce: no request is
 * made, and a query over a few thousand items completes in well under a
 * millisecond.
 */
export function useSearch(query: string, options: SearchOptions = {}): {
  hits: SearchHit[];
  loaded: boolean;
} {
  const { index, loaded } = useItemsState();
  const { kinds, limit, includeArchived } = options;

  const hits = useMemo(
    () => index.search(query, { kinds, limit, includeArchived }),
    // `index` is mutated in place, so it cannot be the sole dependency — the
    // state object identity from the store is what changes per snapshot.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [index, query, kinds, limit, includeArchived, loaded],
  );

  return { hits, loaded };
}

/** Distinct tags with counts, for the filter chips under a section header. */
export function useTags(kinds?: readonly ItemKind[]): { tag: string; count: number }[] {
  const { index, items } = useItemsState();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => index.tagCounts(kinds), [index, items, kinds]);
}

// ─────────────────────────────────────────────────────────────────────────────
// Reminders
// ─────────────────────────────────────────────────────────────────────────────

export interface ReminderBuckets {
  overdue: Item[];
  today: Item[];
  upcoming: Item[];
  done: Item[];
}

/**
 * Everything with a due date, grouped the way you would actually read it.
 *
 * Reminders are not the only items with a `dueAt` — Ralph puts one on any
 * assignment link or note it finds a date inside — so this deliberately spans
 * every kind rather than filtering to `kind === 'reminder'`. A deadline you
 * pasted as a link should still appear in Today.
 */
export function useReminders(now: Date = new Date()): ReminderBuckets {
  const { items } = useItemsState();

  return useMemo(() => {
    const startOfTomorrow = new Date(now);
    startOfTomorrow.setHours(24, 0, 0, 0);

    const buckets: ReminderBuckets = { overdue: [], today: [], upcoming: [], done: [] };

    for (const item of items) {
      if (!item.dueAt || item.status === 'archived') continue;
      if (item.status === 'done') {
        buckets.done.push(item);
        continue;
      }
      const due = new Date(item.dueAt);
      if (due.getTime() < now.getTime()) buckets.overdue.push(item);
      else if (due.getTime() < startOfTomorrow.getTime()) buckets.today.push(item);
      else buckets.upcoming.push(item);
    }

    buckets.overdue.sort(byDueDate);
    buckets.today.sort(byDueDate);
    buckets.upcoming.sort(byDueDate);
    buckets.done.sort(byDueDate).reverse();

    return buckets;
    // `now` is a fresh Date on every render by default; depending on it
    // directly would recompute forever. The item list is the real input.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);
}

/** Count for the navigation badge: what is overdue or due today. */
export function useDueCount(now?: Date): number {
  const { overdue, today } = useReminders(now);
  return overdue.length + today.length;
}

// ─────────────────────────────────────────────────────────────────────────────

/** Per-section counts for the navigation rail. */
export function useSectionCounts(): Record<string, number> {
  const { items } = useItemsState();

  return useMemo(() => {
    const counts: Record<string, number> = {};
    for (const section of SECTIONS) {
      const kinds = new Set(section.kinds);
      counts[section.slug] = items.filter(
        (i) => kinds.has(i.kind) && i.status === 'active',
      ).length;
    }
    return counts;
  }, [items]);
}

const pinnedFirst = (a: Item, b: Item): number => {
  if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
  return a.createdAt < b.createdAt ? 1 : -1;
};

const byDueDate = (a: Item, b: Item): number => (a.dueAt! < b.dueAt! ? -1 : 1);
