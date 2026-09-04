import { NextResponse } from 'next/server';
import { requireUid } from '@/lib/api-auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { getAiProvider } from '@/lib/ai/provider';
import { unfurl } from '@/lib/unfurl';
import {
  applyEnrichmentAdmin,
  applyUnfurlAdmin,
  getItemAdmin,
  getUserSettingsAdmin,
  markEnrichmentFailedAdmin,
  markEnrichmentPendingAdmin,
  markEnrichmentSkippedAdmin,
} from '@/lib/items-admin';

/**
 * `POST /api/enrich { itemId }` — the whole reason Ralph exists.
 *
 * Called fire-and-forget from `enrich-client.ts` right after a capture lands.
 * Nothing about capture depends on this succeeding, or even being reachable —
 * every early return below leaves the item in a well-defined state
 * (`skipped`, `failed`) that the UI already knows how to render, never a
 * silent no-op that would leave a card stuck on "Ralph is writing a
 * description…" forever.
 */
// Vercel's default Serverless Function duration (10s on Hobby) is shorter
// than gemini-3.6-flash's real worst-case latency once its internal
// "thinking" pass is accounted for — this raises the ceiling so the request
// times out on gemini.ts's own 25s AbortController, with a real error
// message, rather than being killed mid-flight by the platform.
export const maxDuration = 30;

export async function POST(request: Request) {
  const auth = await requireUid(request);
  if ('error' in auth) return auth.error;

  const limit = checkRateLimit(`enrich:${auth.uid}`, 30, 10 * 60_000);
  if (!limit.allowed) {
    return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const itemId = typeof body?.itemId === 'string' ? body.itemId : null;
  if (!itemId) {
    return NextResponse.json({ error: 'An "itemId" field is required.' }, { status: 400 });
  }

  const item = await getItemAdmin(auth.uid, itemId);
  if (!item) {
    return NextResponse.json({ error: 'Item not found.' }, { status: 404 });
  }

  const settings = await getUserSettingsAdmin(auth.uid);

  // Two independent gates, and either one alone is enough to skip: a secret
  // must never leave the device even if AI is on, and AI must never run even
  // on a non-secret item once the user has turned it off. Neither check
  // trusts the other.
  if (item.encrypted || settings?.aiEnabled === false) {
    await markEnrichmentSkippedAdmin(auth.uid, itemId);
    return NextResponse.json({ status: 'skipped' });
  }

  const provider = await getAiProvider();
  if (!provider.isConfigured()) {
    await markEnrichmentSkippedAdmin(auth.uid, itemId);
    return NextResponse.json({ status: 'skipped', reason: 'no-provider' });
  }

  await markEnrichmentPendingAdmin(auth.uid, itemId);

  try {
    const unfurled = item.kind === 'link' && item.url ? await unfurl(item.url) : null;

    // Written immediately, before the slower AI call below — this is the
    // "real title and thumbnail fill in fast" half of enrichment.
    if (unfurled) await applyUnfurlAdmin(auth.uid, itemId, unfurled);

    const result = await provider.describe({
      kind: item.kind,
      title: item.title,
      body: item.body,
      url: item.url,
      unfurled: unfurled && (unfurled.title || unfurled.description || unfurled.siteName) ? unfurled : null,
      existingTags: item.tags,
    });

    await applyEnrichmentAdmin(auth.uid, itemId, { ...result, meta: unfurledToMeta(unfurled) }, provider.name);

    return NextResponse.json({ status: 'done' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Enrichment failed.';
    await markEnrichmentFailedAdmin(auth.uid, itemId, message);
    // 200, not 500: the request the client made — "try to enrich this" — was
    // handled correctly. Failure is a valid, expected outcome of that request
    // (a rate-limited free API, a timeout), recorded on the item itself, not
    // a server error the client needs to react to.
    return NextResponse.json({ status: 'failed', error: message });
  }
}

function unfurledToMeta(unfurled: Awaited<ReturnType<typeof unfurl>> | null) {
  if (!unfurled) return undefined;
  return {
    siteName: unfurled.siteName ?? undefined,
  };
}
