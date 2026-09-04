import type { Item } from '../types/index.ts';

/**
 * Turns an item into the words you would plausibly search for.
 *
 * Used twice, for two different jobs:
 *
 *   1. To build `searchTokens` on the document, which powers the Firestore
 *      cold-start query on a device whose cache has not warmed yet.
 *   2. To build the in-memory inverted index, which powers every search after
 *      that and never touches the network.
 *
 * Both must agree, so they share this function. Tokenising twice with two
 * slightly different rules is how a search box starts returning different
 * results depending on how recently the app was opened.
 */

/**
 * Words carrying no discriminating power in a personal archive. Deliberately
 * short: an aggressive stoplist hurts far more than it helps when the corpus is
 * a few thousand items and the queries are one or two words.
 */
const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'but', 'by', 'for', 'from', 'has',
  'have', 'how', 'i', 'if', 'in', 'is', 'it', 'its', 'my', 'of', 'on', 'or',
  'that', 'the', 'this', 'to', 'was', 'were', 'what', 'when', 'which', 'will',
  'with', 'you', 'your', 'http', 'https', 'www', 'com',
]);

/** Firestore caps array fields, and a huge token array is mostly noise anyway. */
export const MAX_STORED_TOKENS = 60;

const MIN_TOKEN_LENGTH = 2;

/**
 * Splits on anything that is not a letter or digit, keeping unicode letters so
 * non-English notes tokenise correctly rather than vanishing.
 */
export function tokenizeText(text: string): string[] {
  if (!text) return [];
  return text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((t) => t.length >= MIN_TOKEN_LENGTH && !STOP_WORDS.has(t));
}

/**
 * A URL's path carries real signal — `/reel/`, `/shorts/`, a repo name, a
 * LeetCode slug — so it is tokenised too, while the opaque id segments and
 * tracking parameters are dropped. Searching for "two-sum" should find the
 * LeetCode link; searching for "igsi" should find nothing.
 */
export function tokenizeUrl(url: string | null): string[] {
  if (!url) return [];
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '');
    const segments = u.pathname.split('/').filter(Boolean);
    const meaningful = segments.filter(
      (s) => s.length >= 3 && s.length <= 40 && !/^[A-Za-z0-9_-]{11,}$/.test(s),
    );
    return tokenizeText([host, ...meaningful].join(' '));
  } catch {
    return [];
  }
}

/**
 * The searchable surface of an item.
 *
 * `body` is included for everything except secrets: the whole point of the
 * vault is that the ciphertext is unreadable, and indexing it would either leak
 * the plaintext into the token array or fill the index with base64 garbage.
 * A secret stays findable by its title and tags, which is what you actually
 * search for ("openai key"), never by its value.
 */
export function tokensForItem(item: Pick<
  Item,
  'title' | 'body' | 'description' | 'tags' | 'url' | 'kind' | 'source' | 'encrypted' | 'meta'
>): string[] {
  const parts = [
    tokenizeText(item.title),
    item.encrypted ? [] : tokenizeText(item.body),
    tokenizeText(item.description),
    item.tags.flatMap(tokenizeText),
    tokenizeUrl(item.url),
    tokenizeText(item.meta?.siteName ?? ''),
    tokenizeText(item.meta?.author ?? ''),
    // Kind and source are searchable words in their own right: typing "reel"
    // or "prompt" is a completely natural way to narrow things down.
    [item.kind, item.source],
  ];

  return dedupe(parts.flat());
}

/** Capped copy for the Firestore document. Ordering is preserved so the most
 *  meaningful tokens — title first — survive the truncation. */
export function storedTokens(item: Parameters<typeof tokensForItem>[0]): string[] {
  return tokensForItem(item).slice(0, MAX_STORED_TOKENS);
}

export function dedupe(tokens: string[]): string[] {
  return [...new Set(tokens)];
}
