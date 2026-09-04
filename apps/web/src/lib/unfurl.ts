import 'server-only';
import { EMPTY_UNFURL, parseUnfurl, type UnfurlResult } from './unfurl-parse';

/**
 * Fetches a URL's Open Graph / meta tags server-side.
 *
 * This has to happen on the server for a reason that has nothing to do with
 * secrets: the browser's CORS policy blocks a page from reading another
 * origin's HTML at all, so there is no client-side version of this function
 * that could ever work. That is the whole justification for `/api/unfurl`
 * existing as a route rather than a `packages/core` utility.
 *
 * The actual tag extraction lives in `unfurl-parse.ts`, kept pure and
 * dependency-free so it can be unit tested directly; this file owns only the
 * networking — the bounded, streamed fetch of just enough of the page to
 * reach its meta tags.
 */
export type { UnfurlResult };

const FETCH_TIMEOUT_MS = 6000;
/** Meta tags live in <head>; nothing past the first 200KB is worth parsing. */
const MAX_BYTES = 200_000;

export async function unfurl(url: string): Promise<UnfurlResult> {
  const html = await fetchHtmlPrefix(url);
  return html ? parseUnfurl(html, url) : EMPTY_UNFURL;
}

async function fetchHtmlPrefix(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        // A generic browser UA — some sites (Instagram among them) serve a
        // near-empty document to anything that looks like a bot, which would
        // make every reel unfurl to nothing.
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
      },
    });

    if (!response.ok || !response.body) return null;
    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('text/html')) return null;

    return await readPrefix(response.body, MAX_BYTES);
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/** Reads at most `maxBytes` from a stream, then cancels it — the page may be
 *  much larger, and there is never a reason to download all of it. */
async function readPrefix(body: ReadableStream<Uint8Array>, maxBytes: number): Promise<string> {
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    while (total < maxBytes) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      total += value.length;
    }
  } finally {
    await reader.cancel().catch(() => {});
  }

  return new TextDecoder('utf-8', { fatal: false }).decode(concat(chunks));
}

function concat(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((sum, c) => sum + c.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}
