import { test } from 'node:test';
import assert from 'node:assert/strict';

import { SearchIndex, isEditDistanceOne, isAdjacentTransposition } from './index.ts';
import { storedTokens } from './tokenize.ts';
import type { Item, ItemKind } from '../types/index.ts';

function makeItem(partial: Partial<Item> & { id: string }): Item {
  return {
    kind: 'note' as ItemKind,
    title: '',
    body: '',
    url: null,
    media: null,
    description: '',
    tags: [],
    source: 'manual',
    meta: {},
    dueAt: null,
    status: 'active',
    pinned: false,
    encrypted: false,
    enrichment: { state: 'idle' },
    searchTokens: [],
    createdAt: '2026-06-01T10:00:00.000Z',
    updatedAt: '2026-06-01T10:00:00.000Z',
    ...partial,
  };
}

const CORPUS: Item[] = [
  makeItem({
    id: 'reel-prompts',
    kind: 'link',
    source: 'instagram',
    title: 'Prompt chaining for agents',
    url: 'https://www.instagram.com/reel/DcMYJ2QBjF_/?igsi=NjdoOWl3M3ZnejVl',
    description: 'Short walkthrough of chaining prompts across multiple model calls.',
    tags: ['prompts', 'ai'],
    createdAt: '2026-05-01T10:00:00.000Z',
  }),
  makeItem({
    id: 'leetcode-two-sum',
    kind: 'code',
    source: 'leetcode',
    title: 'Two Sum — hashmap solution',
    body: 'const seen = new Map(); for (let i = 0; i < nums.length; i++) { ... }',
    url: 'https://leetcode.com/problems/two-sum/',
    tags: ['dsa'],
    createdAt: '2026-04-01T10:00:00.000Z',
  }),
  makeItem({
    id: 'sys-prompt',
    kind: 'prompt',
    title: 'Senior engineer system prompt',
    body: 'Act like a senior full-stack engineer building a production-ready app.',
    tags: ['prompts', 'engineering'],
    createdAt: '2026-06-01T10:00:00.000Z',
  }),
  makeItem({
    id: 'idea-vspace',
    kind: 'idea',
    title: 'V-Space',
    body: 'Turn the WhatsApp self-chat into a searchable personal library.',
    tags: ['startup'],
    createdAt: '2026-03-01T10:00:00.000Z',
  }),
  makeItem({
    id: 'openai-key',
    kind: 'secret',
    title: 'OpenAI key — personal',
    body: 'BASE64CIPHERTEXTdW5yZWFkYWJsZWJ5ZGVzaWdu',
    encrypted: true,
    tags: ['keys'],
    createdAt: '2026-02-01T10:00:00.000Z',
  }),
];

const index = new SearchIndex();
index.rebuild(CORPUS);

const ids = (q: string, opts?: Parameters<SearchIndex['search']>[1]) =>
  index.search(q, opts).map((h) => h.item.id);

test('the index holds the whole corpus', () => {
  assert.equal(index.size, CORPUS.length);
});

test('an exact title word ranks its item first', () => {
  assert.equal(ids('chaining')[0], 'reel-prompts');
});

test('a tag is searchable', () => {
  const found = ids('prompts');
  assert.ok(found.includes('reel-prompts'));
  assert.ok(found.includes('sys-prompt'));
});

test('prefixes match before you finish typing', () => {
  assert.ok(ids('chain').includes('reel-prompts'));
  assert.ok(ids('engin').includes('sys-prompt'));
});

test('a typo still finds the item', () => {
  // "promtp" — transposed, a real typo shape, one edit from "prompt".
  assert.ok(ids('promtps').length > 0, 'fuzzy matching should rescue a typo');
});

test('kind and source are searchable words', () => {
  assert.ok(ids('leetcode').includes('leetcode-two-sum'));
  assert.ok(ids('instagram').includes('reel-prompts'));
  assert.ok(ids('idea').includes('idea-vspace'));
});

test('URL path segments are searchable but tracking ids are not', () => {
  assert.ok(ids('two-sum').includes('leetcode-two-sum'), 'a meaningful slug is indexed');
  assert.equal(ids('NjdoOWl3M3ZnejVl').length, 0, 'an opaque tracking id must not be indexed');
});

test('all query words matching outranks only some matching', () => {
  const hits = index.search('senior engineer prompt');
  assert.equal(hits[0]?.item.id, 'sys-prompt');
});

test('section filtering restricts results to that section kinds', () => {
  const found = ids('prompts', { kinds: ['prompt', 'code'] });
  assert.ok(found.includes('sys-prompt'));
  assert.ok(!found.includes('reel-prompts'), 'a link must not appear in the prompt section');
});

/**
 * The vault's guarantee, checked from the search side. The ciphertext must not
 * be findable — if it were indexed, the token array would be a copy of the
 * encrypted body sitting in memory and, worse, in Firestore.
 */
test('an encrypted body is never indexed, but its title still is', () => {
  assert.ok(ids('openai').includes('openai-key'), 'you must still be able to find the key');
  assert.equal(ids('BASE64CIPHERTEXTdW5yZWFkYWJsZWJ5ZGVzaWdu').length, 0);
  assert.equal(ids('unreadable').length, 0);
});

test('an encrypted body is excluded from the stored Firestore tokens too', () => {
  const secret = CORPUS.find((i) => i.encrypted)!;
  const tokens = storedTokens(secret);
  assert.ok(tokens.includes('openai'));
  assert.ok(!tokens.some((t) => t.includes('base64ciphertext')));
});

test('an empty query returns everything, newest first', () => {
  const found = ids('');
  assert.equal(found.length, CORPUS.length);
  assert.equal(found[0], 'sys-prompt', 'newest item is 2026-06-01');
});

test('archived items are hidden unless asked for', () => {
  const local = new SearchIndex();
  local.rebuild([...CORPUS, makeItem({ id: 'old', title: 'chaining archived', status: 'archived' })]);
  assert.ok(!local.search('chaining').some((h) => h.item.id === 'old'));
  assert.ok(local.search('chaining', { includeArchived: true }).some((h) => h.item.id === 'old'));
});

test('removing an item takes it out of results', () => {
  const local = new SearchIndex();
  local.rebuild(CORPUS);
  local.remove('reel-prompts');
  assert.ok(!local.search('chaining').some((h) => h.item.id === 'reel-prompts'));
});

test('updating an item replaces its old text', () => {
  const local = new SearchIndex();
  local.rebuild(CORPUS);
  local.update(makeItem({ id: 'sys-prompt', title: 'Completely different heading' }));
  assert.ok(local.search('different').some((h) => h.item.id === 'sys-prompt'));
});

test('tagCounts powers the filter chips', () => {
  const counts = index.tagCounts();
  assert.equal(counts.find((c) => c.tag === 'prompts')?.count, 2);
});

test('a nonsense query returns nothing rather than everything', () => {
  assert.equal(ids('zzzzqqqqxxxx').length, 0);
});

test('adjacent transpositions are recognised as one typo', () => {
  // The most common typo shape there is, and plain Levenshtein calls it 2.
  assert.ok(isAdjacentTransposition('prompts', 'promtps'));
  assert.ok(isAdjacentTransposition('the', 'hte'));
  assert.ok(!isAdjacentTransposition('prompts', 'prompts'), 'identical is not a typo');
  assert.ok(!isAdjacentTransposition('abcd', 'badc'), 'two separate swaps is too far');
  assert.ok(!isAdjacentTransposition('abc', 'acb!'), 'different lengths cannot be a swap');
});

test('isEditDistanceOne accepts one edit and rejects two', () => {
  assert.ok(isEditDistanceOne('prompt', 'prompts'), 'insertion');
  assert.ok(isEditDistanceOne('prompt', 'promp'), 'deletion');
  assert.ok(isEditDistanceOne('prompt', 'prompf'), 'substitution');
  assert.ok(!isEditDistanceOne('prompt', 'promote'), 'two edits is too far');
  assert.ok(!isEditDistanceOne('prompt', 'prompt'), 'identical is not an edit');
});

test('search over a few thousand items stays instant', () => {
  const many = Array.from({ length: 3000 }, (_, i) =>
    makeItem({
      id: `bulk-${i}`,
      title: `Bulk item ${i} about prompts and agents`,
      body: 'Some longer body text that exists to make the index realistically sized.',
      tags: [`tag${i % 40}`],
    }),
  );
  const local = new SearchIndex();
  local.rebuild(many);

  const start = performance.now();
  for (let i = 0; i < 20; i++) local.search('prompts agents');
  const perQuery = (performance.now() - start) / 20;

  assert.ok(perQuery < 50, `expected well under 50ms per query, got ${perQuery.toFixed(1)}ms`);
});
