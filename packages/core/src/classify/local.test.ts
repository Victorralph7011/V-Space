import { test } from 'node:test';
import assert from 'node:assert/strict';

import { classify, extractDueDate, sourceForUrl, extractHashtags } from './local.ts';

/**
 * Run with: npm test
 *
 * The classifier decides where everything you capture lands, and it runs before
 * any network call — so a regression here silently misfiles items with no error
 * anywhere. These cases are the real shapes of things pasted into a self-chat,
 * copied from the WhatsApp history this app replaces.
 *
 * A fixed `now` (Friday 21 Aug 2026, 10:00 local) keeps relative dates like
 * "friday" and "tomorrow" deterministic.
 */
const NOW = new Date(2026, 7, 21, 10, 0, 0);

test('links are recognised with their source platform', () => {
  const cases: [string, string][] = [
    ['https://www.instagram.com/reel/DcMYJ2QBjF_/?igsi=NjdoOWl3M3ZnejVl', 'instagram'],
    ['https://youtube.com/shorts/abc123', 'youtube'],
    ['https://youtu.be/dQw4w9WgXcQ', 'youtube'],
    ['https://leetcode.com/problems/two-sum/', 'leetcode'],
    ['https://github.com/facebook/react', 'github'],
    ['https://x.com/someone/status/123', 'x'],
    ['https://example.org/blog/post', 'web'],
  ];
  for (const [url, source] of cases) {
    const c = classify(url, NOW);
    assert.equal(c.kind, 'link', url);
    assert.equal(c.source, source, url);
    assert.equal(c.url, url);
  }
});

test('a URL buried in a sentence is still extracted', () => {
  const c = classify('this one is great https://www.instagram.com/reel/DcElx3fuTTf/ watch it', NOW);
  assert.equal(c.kind, 'link');
  assert.equal(c.url, 'https://www.instagram.com/reel/DcElx3fuTTf/');
});

test('trailing punctuation is not swallowed into the URL', () => {
  const c = classify('see https://example.org/a.', NOW);
  assert.equal(c.url, 'https://example.org/a');
});

test('prompts are recognised by how prompts are actually written', () => {
  const prompt =
    'Act like a senior full-stack engineer building a production-ready app from ' +
    'scratch. First design the complete system architecture, then build the most ' +
    'minimal but scalable version possible.';
  const c = classify(prompt, NOW);
  assert.equal(c.kind, 'prompt');
  assert.ok(c.confidence >= 0.7, 'a long, clearly-marked prompt should not need Ralph');
});

test('reminders capture both the kind and the date', () => {
  const c = classify('submit DBMS assignment friday 6pm', NOW);
  assert.equal(c.kind, 'reminder');
  assert.ok(c.dueAt);
  const due = new Date(c.dueAt!);
  assert.equal(due.getDay(), 5, 'friday');
  assert.equal(due.getHours(), 18, '6pm');
  assert.equal(due.getDate(), 28, 'the NEXT friday, not today');
});

test('ideas land in the ideas section', () => {
  const c = classify('idea: turn the whatsapp self-chat into a real searchable library', NOW);
  assert.equal(c.kind, 'idea');
});

test('code is detected without a fence', () => {
  const c = classify('const memo = new Map(); function fib(n) { return n < 2 ? n : fib(n-1); }', NOW);
  assert.equal(c.kind, 'code');
});

/**
 * A real failure caught in production: this idea was misfiled into the
 * Prompt Library (code) instead of Innovative Ideas, because "function" also
 * matched the loose code-keyword check as a bare English word before the
 * idea markers ever got a turn.
 */
test('a programming word used in plain English does not get misread as code', () => {
  const cases = [
    'idea: a browser extension that auto-generates unit tests from a function you highlight',
    'idea: an app that helps you class your expenses automatically',
    "idea: let people import their contacts from any app",
  ];
  for (const text of cases) {
    assert.equal(classify(text, NOW).kind, 'idea', text);
  }
});

test('real code with those same keywords is still detected', () => {
  const cases = [
    'function greet(name) { return `hi ${name}`; }',
    'class Animal { constructor(name) { this.name = name; } }',
    'def greet(name):\n    return f"hi {name}"',
    "import { useState } from 'react';",
    'public static void main(String[] args) {}',
    'SELECT id, name FROM users WHERE active = true;',
  ];
  for (const text of cases) {
    assert.equal(classify(text, NOW).kind, 'code', text);
  }
});

test('plain text falls through to note rather than failing', () => {
  const c = classify('random thought with no signal at all', NOW);
  assert.equal(c.kind, 'note');
  assert.ok(c.confidence < 0.7, 'low confidence should invite Ralph to reconsider');
});

/**
 * The single most important behaviour in this file. An API key misfiled as a
 * `note` would be stored in the clear — the encryption only protects items that
 * reach it as `secret`, so this rule has to fire before every other match.
 */
test('credentials are detected before anything else can claim them', () => {
  const cases = [
    'ANTHROPIC_API_KEY=sk-ant-api03-abcdefghijklmnopqrstuvwx',
    'sk-proj-abcdefghijklmnopqrstuvwxyz123456',
    'AIzaSyD-abcdefghijklmnopqrstuvwxyz1234567',
    'ghp_abcdefghijklmnopqrstuvwxyz1234567890',
    'my api key: hunter2hunter2hunter2',
  ];
  for (const text of cases) {
    assert.equal(classify(text, NOW).kind, 'secret', text.slice(0, 24));
  }
});

test('a secret title never contains the secret', () => {
  const c = classify('ANTHROPIC_API_KEY=sk-ant-api03-abcdefghijklmnopqrstuvwx', NOW);
  assert.ok(!c.title.includes('sk-ant'), `title leaked the key: ${c.title}`);
  assert.ok(c.title.includes('••••'));
});

test('a URL that also looks like a prompt is still filed as a link', () => {
  // Ordering matters: the URL rule runs before the prompt markers, because the
  // link is the thing being saved and the surrounding words are just a note.
  const c = classify('act like a designer and study https://example.org/ui', NOW);
  assert.equal(c.kind, 'link');
});

test('hashtags become tags', () => {
  assert.deepEqual(extractHashtags('saved this #prompts #ai-agents #Prompts'), [
    'prompts',
    'ai-agents',
  ]);
});

test('sourceForUrl tolerates junk without throwing', () => {
  assert.equal(sourceForUrl('not a url at all'), 'web');
});

test('date phrases resolve the way people mean them', () => {
  const on = (t: string) => {
    const iso = extractDueDate(t, NOW);
    assert.ok(iso, `expected a date from: ${t}`);
    return new Date(iso!);
  };

  assert.equal(on('tomorrow').getDate(), 22);
  assert.equal(on('tonight').getHours(), 20, 'tonight means evening, not 9am');
  assert.equal(on('today 3pm').getHours(), 15);
  assert.equal(on('monday 9am').getDay(), 1);
  assert.equal(on('by 25 dec').getMonth(), 11);
  assert.equal(on('exam on march 4th').getMonth(), 2);
  assert.equal(on('exam on march 4th').getFullYear(), 2027, 'a passed date rolls to next year');
  assert.equal(on('due 3/11').getDate(), 3, 'numeric dates are day-first');
  assert.equal(on('due 3/11').getMonth(), 10);
  assert.equal(extractDueDate('no date here', NOW), null);
});

test('a bare time defaults to 9am, not midnight', () => {
  const iso = extractDueDate('tomorrow', NOW)!;
  assert.equal(new Date(iso).getHours(), 9);
});

test('month abbreviations do not match ordinary words', () => {
  // "marks" starts with "mar" — the optional-remainder pattern must reject it,
  // or every mention of marks or augmented or maybe becomes a fake deadline.
  assert.equal(extractDueDate('submit marks soon', NOW), null);
  assert.equal(extractDueDate('the augmented reality demo', NOW), null);
  assert.equal(extractDueDate('january 5', NOW)!.slice(0, 4), '2027');
});
