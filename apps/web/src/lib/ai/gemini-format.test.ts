import { test } from 'node:test';
import assert from 'node:assert/strict';

import { buildPrompt, sanitize } from './gemini-format.ts';
import type { EnrichInput } from './provider.ts';

const BASE_INPUT: EnrichInput = {
  kind: 'link',
  title: 'Instagram reel',
  body: '',
  url: 'https://www.instagram.com/reel/abc/',
  unfurled: { title: 'A reel about prompts', description: '1.2k likes', siteName: 'Instagram' },
  existingTags: [],
};

// ── sanitize: the trust boundary ────────────────────────────────────────────

test('a well-formed response passes through', () => {
  const result = sanitize(
    { description: 'A short reel about prompt chaining.', tags: ['prompts', 'ai'] },
    BASE_INPUT,
  );
  assert.equal(result.description, 'A short reel about prompt chaining.');
  assert.deepEqual(result.tags, ['prompts', 'ai']);
  assert.equal(result.title, undefined);
  assert.equal(result.dueAt, undefined);
  assert.equal(result.kind, undefined);
});

test('a completely garbage response degrades to empty, not a throw', () => {
  const result = sanitize('not even an object', BASE_INPUT);
  assert.equal(result.description, '');
  assert.deepEqual(result.tags, []);
});

test('null and undefined responses are handled the same way', () => {
  assert.deepEqual(sanitize(null, BASE_INPUT), { description: '', tags: [] });
  assert.deepEqual(sanitize(undefined, BASE_INPUT), { description: '', tags: [] });
});

test('tags are capped at 5, however many the model returns', () => {
  const result = sanitize({ description: 'x', tags: ['a', 'b', 'c', 'd', 'e', 'f', 'g'] }, BASE_INPUT);
  assert.equal(result.tags.length, 5);
});

test('tags are normalised: lowercased, hashless, hyphenated', () => {
  const result = sanitize({ description: 'x', tags: ['#Prompts', 'AI Agents', '  spaced  '] }, BASE_INPUT);
  assert.deepEqual(result.tags, ['prompts', 'ai-agents', 'spaced']);
});

test('non-string entries in the tags array are dropped, not stringified', () => {
  const result = sanitize({ description: 'x', tags: ['real', 42, null, {}, 'also-real'] }, BASE_INPUT);
  assert.deepEqual(result.tags, ['real', 'also-real']);
});

test('a description is truncated rather than stored unbounded', () => {
  const huge = 'x'.repeat(10_000);
  const result = sanitize({ description: huge, tags: [] }, BASE_INPUT);
  assert.equal(result.description.length, 500);
});

/**
 * The single most important case in this file. Gemini is explicitly told
 * never to return "secret" in the system prompt, but a prompt is a
 * suggestion, not a guarantee — a model can still emit it, whether by mistake
 * or because the input text talks about "a secret plan". If that value ever
 * reached `applyEnrichment`, `shouldAcceptKind` in @vspace/core independently
 * refuses it too — this is the first of two layers, not the only one.
 */
test('kind "secret" from the model is dropped, not passed through', () => {
  const result = sanitize({ description: 'x', tags: [], kind: 'secret' }, BASE_INPUT);
  assert.equal(result.kind, undefined);
});

test('an invalid kind string is dropped', () => {
  const result = sanitize({ description: 'x', tags: [], kind: 'banana' }, BASE_INPUT);
  assert.equal(result.kind, undefined);
});

test('a valid kind is accepted', () => {
  const result = sanitize({ description: 'x', tags: [], kind: 'idea' }, BASE_INPUT);
  assert.equal(result.kind, 'idea');
});

test('title is only set when it actually differs from the input title', () => {
  const same = sanitize({ description: 'x', tags: [], title: BASE_INPUT.title }, BASE_INPUT);
  assert.equal(same.title, undefined, 'identical title should not trigger an update');

  const different = sanitize({ description: 'x', tags: [], title: 'A much better title' }, BASE_INPUT);
  assert.equal(different.title, 'A much better title');
});

test('an unparseable dueAt is dropped rather than stored as Invalid Date', () => {
  const result = sanitize({ description: 'x', tags: [], dueAt: 'not a real date' }, BASE_INPUT);
  assert.equal(result.dueAt, undefined);
});

test('a valid dueAt is normalised to a real ISO string', () => {
  const result = sanitize({ description: 'x', tags: [], dueAt: '2026-12-25' }, BASE_INPUT);
  assert.ok(result.dueAt);
  assert.equal(new Date(result.dueAt!).getUTCFullYear(), 2026);
});

// ── buildPrompt ──────────────────────────────────────────────────────────────

test('the prompt includes unfurled metadata for a link', () => {
  const prompt = buildPrompt(BASE_INPUT);
  assert.match(prompt, /Site: Instagram/);
  assert.match(prompt, /Page title: A reel about prompts/);
});

test('the prompt omits sections that have no data, rather than printing empty labels', () => {
  const prompt = buildPrompt({ ...BASE_INPUT, url: null, unfurled: null, existingTags: [] });
  assert.doesNotMatch(prompt, /URL:/);
  assert.doesNotMatch(prompt, /Site:/);
  assert.doesNotMatch(prompt, /Existing tags:/);
});

test('body content is capped so one huge paste cannot blow the request', () => {
  const prompt = buildPrompt({ ...BASE_INPUT, body: 'y'.repeat(20_000) });
  const contentSection = prompt.split('Content:\n')[1] ?? '';
  assert.ok(contentSection.length <= 4000);
});
