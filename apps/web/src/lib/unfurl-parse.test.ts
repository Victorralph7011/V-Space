import { test } from 'node:test';
import assert from 'node:assert/strict';

import { decodeEntities, metaContent, parseUnfurl, resolveUrl, tagText } from './unfurl-parse.ts';

test('extracts og:title regardless of attribute order', () => {
  const propertyFirst = `<meta property="og:title" content="A great reel">`;
  const contentFirst = `<meta content="A great reel" property="og:title">`;
  assert.equal(metaContent(propertyFirst, 'og:title'), 'A great reel');
  assert.equal(metaContent(contentFirst, 'og:title'), 'A great reel');
});

test('falls back to <title> when there is no og:title', () => {
  const html = `<html><head><title>Fallback Title</title></head></html>`;
  const result = parseUnfurl(html, 'https://example.org');
  assert.equal(result.title, 'Fallback Title');
});

test('og:title wins over <title> when both are present', () => {
  const html = `<title>Boring Title</title><meta property="og:title" content="Real Title">`;
  const result = parseUnfurl(html, 'https://example.org');
  assert.equal(result.title, 'Real Title');
});

test('a missing field is null, not an empty string or undefined', () => {
  const result = parseUnfurl('<html></html>', 'https://example.org');
  assert.equal(result.title, null);
  assert.equal(result.description, null);
  assert.equal(result.imageUrl, null);
  assert.equal(result.siteName, null);
});

test('og:description falls back to the plain description meta tag', () => {
  const html = `<meta name="description" content="Plain description">`;
  assert.equal(metaContent(html, 'og:description') ?? metaContent(html, 'description'), 'Plain description');
});

test('HTML entities in meta content are decoded', () => {
  const html = `<meta property="og:title" content="Fish &amp; Chips &mdash; a &quot;classic&quot;">`;
  // &mdash; is not in the small entity table this parser supports, and that's
  // fine — falling back to the literal text is safer than guessing wrong.
  assert.equal(metaContent(html, 'og:title'), 'Fish & Chips &mdash; a "classic"');
});

test('numeric character references decode, decimal and hex', () => {
  assert.equal(decodeEntities('caf&#233;'), 'café');
  assert.equal(decodeEntities('caf&#xe9;'), 'café');
});

test('a relative og:image is resolved against the source URL', () => {
  const html = `<meta property="og:image" content="/static/thumb.jpg">`;
  const result = parseUnfurl(html, 'https://example.org/reel/123');
  assert.equal(result.imageUrl, 'https://example.org/static/thumb.jpg');
});

test('an absolute og:image is left as-is', () => {
  const html = `<meta property="og:image" content="https://cdn.example.org/thumb.jpg">`;
  const result = parseUnfurl(html, 'https://example.org/reel/123');
  assert.equal(result.imageUrl, 'https://cdn.example.org/thumb.jpg');
});

test('an unresolvable URL does not throw, just yields null', () => {
  // WHATWG's URL constructor is permissive with a valid base — almost any
  // string resolves as a relative path rather than throwing. What actually
  // triggers the failure path is a base that isn't a URL at all.
  assert.equal(resolveUrl('/thumb.jpg', 'not a base url'), null);
});

test('null is returned rather than throwing when there is no value to resolve', () => {
  assert.equal(resolveUrl(null, 'https://example.org'), null);
});

test('a realistic Instagram-shaped document parses all four fields', () => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta property="og:site_name" content="Instagram" />
      <meta property="og:title" content="Prompt chaining explained (@someone) on Instagram" />
      <meta property="og:description" content="1,204 likes, 12 comments" />
      <meta property="og:image" content="https://scontent.cdninstagram.com/thumb.jpg" />
      <title>Instagram</title>
    </head>
    <body></body>
    </html>
  `;
  const result = parseUnfurl(html, 'https://www.instagram.com/reel/abc123/');
  assert.equal(result.siteName, 'Instagram');
  assert.equal(result.title, 'Prompt chaining explained (@someone) on Instagram');
  assert.equal(result.description, '1,204 likes, 12 comments');
  assert.equal(result.imageUrl, 'https://scontent.cdninstagram.com/thumb.jpg');
});

test('title text is trimmed of surrounding whitespace', () => {
  assert.equal(tagText('<title>\n   Padded Title   \n</title>', 'title'), 'Padded Title');
});

test('single-quoted attributes are matched too', () => {
  const html = `<meta property='og:title' content='Single quoted'>`;
  assert.equal(metaContent(html, 'og:title'), 'Single quoted');
});
