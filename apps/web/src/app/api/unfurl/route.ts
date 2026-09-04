import { NextResponse } from 'next/server';
import { requireUid } from '@/lib/api-auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { unfurl } from '@/lib/unfurl';

/**
 * `GET /api/unfurl?url=...` — fetches a link's Open Graph metadata.
 *
 * This is the one endpoint that does not touch the AI provider at all. It
 * exists purely because a browser cannot read another origin's HTML
 * (CORS) — see `unfurl.ts` for the full reasoning. Called from the item
 * detail page and, in a later milestone, automatically for every freshly
 * captured link.
 */
export async function GET(request: Request) {
  const auth = await requireUid(request);
  if ('error' in auth) return auth.error;

  // Generous relative to /api/enrich: this never calls a paid or quota-limited
  // model, so the only thing worth guarding against is a runaway client loop.
  const limit = checkRateLimit(`unfurl:${auth.uid}`, 60, 60_000);
  if (!limit.allowed) {
    return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
  }

  const url = new URL(request.url).searchParams.get('url');
  if (!url || !isHttpUrl(url)) {
    return NextResponse.json({ error: 'A valid http(s) url query parameter is required.' }, { status: 400 });
  }

  const result = await unfurl(url);
  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'private, max-age=86400' },
  });
}

function isHttpUrl(value: string): boolean {
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}
