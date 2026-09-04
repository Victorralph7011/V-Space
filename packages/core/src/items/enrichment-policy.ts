import type { Item, ItemKind } from '../types/index.ts';

/**
 * The rules for what a model is allowed to change on an item, kept separate
 * from `services.ts` and free of any Firestore import.
 *
 * The reason it is its own file: this exact logic has to run in two different
 * runtimes that must never disagree — the browser, applying a result through
 * the client SDK in `services.ts`, and the enrichment API route on Vercel,
 * applying one through `firebase-admin`. A pure function of plain objects is
 * usable from both without either depending on the other's Firestore client.
 */

/** Titles the local classifier invents as placeholders, which Ralph may replace. */
const PLACEHOLDER_TITLES = new Set([
  'untitled',
  'instagram reel',
  'instagram post',
  'youtube video',
  'youtube short',
  'leetcode problem',
  'github repository',
  'saved link',
]);

export function isPlaceholderTitle(title: string): boolean {
  const normalised = title.trim().toLowerCase();
  // A bare hostname ("example.org") is also a placeholder, not a real title.
  return PLACEHOLDER_TITLES.has(normalised) || /^[a-z0-9.-]+\.[a-z]{2,}$/.test(normalised);
}

/**
 * Ralph may refine a kind, but not overrule a confident local decision.
 *
 * `secret` is never entered or left by a model: a key is protected by having
 * been recognised as one on-device, and letting a remote response reclassify it
 * would move it out of the vault and into plaintext.
 */
export function shouldAcceptKind(current: Pick<Item, 'kind' | 'encrypted'>, proposed: ItemKind): boolean {
  if (current.kind === 'secret' || proposed === 'secret') return false;
  if (current.encrypted) return false;
  // Only ever promote away from the two "I could not tell" kinds.
  return current.kind === 'note' || current.kind === 'link';
}

export function mergeTags(existing: string[], incoming: string[]): string[] {
  const normalise = (t: string) => t.trim().toLowerCase().replace(/\s+/g, '-');
  return [...new Set([...existing, ...incoming].map(normalise).filter(Boolean))].slice(0, 12);
}
