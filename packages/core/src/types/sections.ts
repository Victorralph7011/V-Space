import type { ItemKind } from './index.ts';

/**
 * The five sections are *configuration*, not code.
 *
 * Each entry declares a route, a label, and which item kinds it collects.
 * Navigation, the section pages, the chat's "Saved to …" reply, and the search
 * filter chips all read from this array. Adding a sixth section is one entry
 * here plus a page file — not a new collection, type, service, or query.
 */
export interface SectionConfig {
  /** URL segment on web, route name on mobile. */
  slug: string;
  label: string;
  /** Singular, for the "Saved to Links Space" chat reply. */
  singular: string;
  /**
   * Kinds this section collects. Several sections gather more than one kind:
   * a LeetCode solution and a saved snippet are both `code`, and both belong
   * in the Prompt Library alongside prompts, because that is where you go
   * looking for "text I want to paste somewhere else".
   */
  kinds: ItemKind[];
  /** Placeholder shown in the section's own search box. */
  searchHint: string;
  /** Shown when the section is empty. */
  emptyTitle: string;
  emptyBody: string;
}

export const SECTIONS: readonly SectionConfig[] = [
  {
    slug: 'prompts',
    label: 'Prompt Library',
    singular: 'Prompt Library',
    kinds: ['prompt', 'code'],
    searchHint: 'Search prompts and snippets',
    emptyTitle: 'No prompts yet',
    emptyBody: 'Paste a prompt into the chat and it lands here, tagged and searchable.',
  },
  {
    slug: 'images',
    label: 'Image Store',
    singular: 'Image Store',
    kinds: ['image'],
    searchHint: 'Search screenshots and images',
    emptyTitle: 'No images yet',
    emptyBody: 'Drop a screenshot into the chat. Ralph reads it and writes the caption.',
  },
  {
    slug: 'links',
    label: 'Links Space',
    singular: 'Links Space',
    kinds: ['link'],
    searchHint: 'Search reels, videos and articles',
    emptyTitle: 'No links yet',
    emptyBody: 'Paste any URL — a reel, a short, a doc — and it is filed with a description.',
  },
  {
    slug: 'ideas',
    label: 'Innovative Ideas',
    singular: 'Innovative Ideas',
    kinds: ['idea'],
    searchHint: 'Search ideas',
    emptyTitle: 'No ideas yet',
    emptyBody: 'Write the startup idea down before you lose it. Shape it later.',
  },
  {
    slug: 'reminders',
    label: 'Daily Reminders',
    singular: 'Daily Reminders',
    kinds: ['reminder'],
    searchHint: 'Search reminders and deadlines',
    emptyTitle: 'Nothing due',
    emptyBody: 'Type "submit DBMS assignment friday 6pm" and the date is picked up for you.',
  },
] as const;

/** Kinds with no section of their own still live in the stream and in search. */
export const UNSECTIONED_KINDS: readonly ItemKind[] = ['note', 'secret'];

export const sectionBySlug = (slug: string): SectionConfig | undefined =>
  SECTIONS.find((s) => s.slug === slug);

export const sectionForKind = (kind: ItemKind): SectionConfig | undefined =>
  SECTIONS.find((s) => s.kinds.includes(kind));
