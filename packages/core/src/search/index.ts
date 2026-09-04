import type { Item, ItemKind } from '../types/index.ts';
import { tokenizeText, tokenizeUrl } from './tokenize.ts';

/**
 * An in-memory inverted index over everything you have saved.
 *
 * This is the answer to the actual problem V-Space exists to solve. Firestore
 * cannot do full-text search, and the usual fixes — Algolia, Typesense, a
 * vector database — all mean another service, another key, and a monthly bill,
 * to search a corpus that fits comfortably in a few megabytes of RAM.
 *
 * So the index lives on the device. Firestore's offline cache already holds
 * every item locally; this builds a searchable structure over it once and keeps
 * it current as snapshots arrive. Queries never touch the network, cost
 * nothing, work on a plane, and return in well under a millisecond at the
 * scale a personal archive actually reaches.
 *
 * Rebuilding from scratch is cheap enough (a few thousand items in a handful of
 * milliseconds) that correctness never depends on incremental updates being
 * perfect — `rebuild()` is always available as the safe path.
 */

/**
 * Where a token was found determines how much a match on it means. A query word
 * appearing in a title is a much stronger signal than the same word buried in
 * the body of a long prompt.
 */
const FIELD_WEIGHTS = {
  title: 10,
  tags: 8,
  description: 5,
  url: 4,
  body: 2,
} as const;

type Field = keyof typeof FIELD_WEIGHTS;

/**
 * How the token matched, as a multiplier on the field weight. Exact matches
 * dominate; a fuzzy match is a last resort that should never outrank a real one.
 */
const MATCH_QUALITY = {
  exact: 1,
  prefix: 0.6,
  fuzzy: 0.25,
} as const;

interface Entry {
  item: Item;
  /** token → highest field weight that token appears at, for this item. */
  weights: Map<string, number>;
}

export interface SearchHit {
  item: Item;
  score: number;
}

export interface SearchOptions {
  /** Restrict to a section's kinds. Empty or omitted searches everything. */
  kinds?: readonly ItemKind[];
  limit?: number;
  /** Archived items are excluded by default — they are out of the way on purpose. */
  includeArchived?: boolean;
}

export class SearchIndex {
  private entries = new Map<string, Entry>();

  /** Every distinct token in the corpus, for prefix and fuzzy candidate lookup. */
  private vocabulary = new Set<string>();

  get size(): number {
    return this.entries.size;
  }

  rebuild(items: readonly Item[]): void {
    this.entries.clear();
    this.vocabulary.clear();
    for (const item of items) this.add(item);
  }

  add(item: Item): void {
    const weights = new Map<string, number>();

    const absorb = (tokens: string[], field: Field) => {
      const weight = FIELD_WEIGHTS[field];
      for (const token of tokens) {
        const existing = weights.get(token) ?? 0;
        if (weight > existing) weights.set(token, weight);
        this.vocabulary.add(token);
      }
    };

    absorb(tokenizeText(item.title), 'title');
    absorb(item.tags.flatMap(tokenizeText), 'tags');
    absorb(tokenizeText(item.description), 'description');
    absorb(tokenizeUrl(item.url), 'url');
    // Secrets are indexed by title and tags only — the ciphertext is
    // meaningless and the plaintext is never in memory here.
    if (!item.encrypted) absorb(tokenizeText(item.body), 'body');
    // Kind and source are searchable words: "reel", "prompt", "leetcode".
    absorb([item.kind, item.source], 'tags');

    this.entries.set(item.id, { item, weights });
  }

  remove(id: string): void {
    this.entries.delete(id);
    // The vocabulary is intentionally not pruned. A stale token costs one
    // wasted comparison during candidate lookup and nothing else, whereas
    // reference-counting every token to know when it is safe to drop would add
    // real bookkeeping to the hot path for no user-visible gain.
  }

  /** Replaces an item in place. Snapshots deliver whole documents, so this is
   *  just remove + add, kept as one call so callers cannot forget half of it. */
  update(item: Item): void {
    this.add(item);
  }

  search(query: string, options: SearchOptions = {}): SearchHit[] {
    const queryTokens = tokenizeText(query);
    const limit = options.limit ?? 50;

    // An empty query is "show me everything", newest first — the natural
    // behaviour when a search box is focused but not yet typed into.
    if (queryTokens.length === 0) {
      return this.allMatching(options)
        .sort(byRecency)
        .slice(0, limit)
        .map((item) => ({ item, score: 0 }));
    }

    const kinds = options.kinds && options.kinds.length ? new Set(options.kinds) : null;
    const hits: SearchHit[] = [];

    for (const entry of this.entries.values()) {
      const { item } = entry;
      if (kinds && !kinds.has(item.kind)) continue;
      if (!options.includeArchived && item.status === 'archived') continue;

      let score = 0;
      let matchedAll = true;

      for (const token of queryTokens) {
        const best = this.scoreToken(entry, token);
        if (best === 0) matchedAll = false;
        score += best;
      }

      if (score === 0) continue;

      // Every query word matching is a far better result than most of them
      // matching, and multi-word queries are how you narrow things down.
      if (matchedAll && queryTokens.length > 1) score *= 1.8;

      // A phrase appearing verbatim in the title is almost always the thing
      // you meant, whatever the token maths says.
      if (queryTokens.length > 1 && item.title.toLowerCase().includes(query.trim().toLowerCase())) {
        score *= 2.5;
      }

      if (item.pinned) score *= 1.3;
      score *= recencyBoost(item.createdAt);

      hits.push({ item, score });
    }

    return hits
      .sort((a, b) => b.score - a.score || byRecency(a.item, b.item))
      .slice(0, limit);
  }

  /**
   * Best score for one query token against one item, trying progressively
   * looser matches and stopping at the first that hits. Ordering matters:
   * a fuzzy match must never be preferred over an exact one.
   */
  private scoreToken(entry: Entry, token: string): number {
    const exact = entry.weights.get(token);
    if (exact !== undefined) return exact * MATCH_QUALITY.exact;

    // Prefix: typing "prom" should find "prompts" before you finish the word.
    let bestPrefix = 0;
    for (const [indexed, weight] of entry.weights) {
      if (indexed.length > token.length && indexed.startsWith(token) && weight > bestPrefix) {
        bestPrefix = weight;
      }
    }
    if (bestPrefix > 0) return bestPrefix * MATCH_QUALITY.prefix;

    // Fuzzy, only for words long enough that a typo is plausible and a
    // one-edit neighbour is unlikely to be a genuinely different word.
    if (token.length < 4) return 0;
    let bestFuzzy = 0;
    for (const [indexed, weight] of entry.weights) {
      if (Math.abs(indexed.length - token.length) > 1) continue;
      if (weight > bestFuzzy && isNearMatch(indexed, token)) bestFuzzy = weight;
    }
    return bestFuzzy * MATCH_QUALITY.fuzzy;
  }

  private allMatching(options: SearchOptions): Item[] {
    const kinds = options.kinds && options.kinds.length ? new Set(options.kinds) : null;
    const out: Item[] = [];
    for (const { item } of this.entries.values()) {
      if (kinds && !kinds.has(item.kind)) continue;
      if (!options.includeArchived && item.status === 'archived') continue;
      out.push(item);
    }
    return out;
  }

  /** Distinct tags across the corpus with counts, for the filter chips. */
  tagCounts(kinds?: readonly ItemKind[]): { tag: string; count: number }[] {
    const kindSet = kinds && kinds.length ? new Set(kinds) : null;
    const counts = new Map<string, number>();
    for (const { item } of this.entries.values()) {
      if (kindSet && !kindSet.has(item.kind)) continue;
      if (item.status === 'archived') continue;
      for (const tag of item.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
  }
}

// ─────────────────────────────────────────────────────────────────────────────

const byRecency = (a: Item, b: Item): number => (a.createdAt < b.createdAt ? 1 : -1);

/**
 * A gentle preference for recent items: roughly 1.5x for something saved today
 * decaying towards 1.0 over a year. Deliberately mild — you search this archive
 * precisely to find the thing from months ago, so recency must break ties
 * without ever burying an older, better match.
 */
function recencyBoost(createdAt: string): number {
  const ageDays = (Date.now() - new Date(createdAt).getTime()) / 86_400_000;
  if (!Number.isFinite(ageDays) || ageDays < 0) return 1;
  return 1 + 0.5 / (1 + ageDays / 30);
}

/**
 * True when `a` and `b` are one typo apart.
 *
 * "One typo" deliberately means Damerau-Levenshtein distance 1, not plain
 * Levenshtein: transposing two adjacent letters is by far the most common
 * mistake a fast typist makes, and plain Levenshtein scores it as distance 2.
 * Without the transposition case, searching "promtps" finds nothing — which is
 * exactly the moment a search box feels broken.
 *
 * Capping at one edit rather than two is what keeps results trustworthy:
 * distance 2 would let "prompt" match "promote", and a wrong confident answer
 * is worse than no answer.
 */
export function isNearMatch(a: string, b: string): boolean {
  return isEditDistanceOne(a, b) || isAdjacentTransposition(a, b);
}

/** True when swapping one adjacent pair of characters in `a` yields `b`. */
export function isAdjacentTransposition(a: string, b: string): boolean {
  if (a.length !== b.length || a === b) return false;

  // Find the first and last positions where the strings disagree. A single
  // adjacent swap can only ever produce exactly two such positions, and they
  // must be neighbours with their characters crossed over.
  let first = -1;
  let last = -1;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      if (first === -1) first = i;
      last = i;
    }
  }
  return last - first === 1 && a[first] === b[last] && a[last] === b[first];
}

/**
 * True when one edit (insert, delete, or substitute) turns `a` into `b`.
 *
 * Cheaper and more predictable than a full Levenshtein matrix: it short-circuits
 * on a length difference above one and walks each string once.
 */
export function isEditDistanceOne(a: string, b: string): boolean {
  if (a === b) return false;
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  if (long.length - short.length > 1) return false;

  let i = 0;
  let j = 0;
  let edited = false;

  while (i < short.length && j < long.length) {
    if (short[i] === long[j]) {
      i++;
      j++;
      continue;
    }
    if (edited) return false;
    edited = true;
    // Same length ⇒ substitution, so advance both. Different ⇒ deletion from
    // the longer string, so advance only it.
    if (short.length === long.length) i++;
    j++;
  }
  return true;
}
