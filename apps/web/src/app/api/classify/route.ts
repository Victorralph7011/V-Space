import { NextResponse } from 'next/server';
import { requireUid } from '@/lib/api-auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { getAiProvider } from '@/lib/ai/provider';
import { getUserSettingsAdmin } from '@/lib/items-admin';

/**
 * `POST /api/classify { text }` — a second opinion for text the local
 * classifier (`packages/core/classify/local.ts`) filed with low confidence.
 *
 * Reuses the same `describe()` the enrichment pipeline calls, just seeded
 * with `kind: 'note'` and no existing title — since a low-confidence local
 * result is functionally "I don't know what this is", asking the model for a
 * kind is the same request as asking it to enrich a `note`. One AI method
 * instead of two keeps the provider interface (and therefore any future
 * provider swap) to a single function.
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

  const limit = checkRateLimit(`classify:${auth.uid}`, 20, 60_000);
  if (!limit.allowed) {
    return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
  }

  const settings = await getUserSettingsAdmin(auth.uid);
  if (settings && !settings.aiEnabled) {
    return NextResponse.json({ error: 'AI is turned off in settings.' }, { status: 409 });
  }

  const body = await request.json().catch(() => null);
  const text = typeof body?.text === 'string' ? body.text.trim() : '';
  if (!text) {
    return NextResponse.json({ error: 'A non-empty "text" field is required.' }, { status: 400 });
  }

  const provider = await getAiProvider();
  if (!provider.isConfigured()) {
    return NextResponse.json({ error: 'No AI provider is configured.' }, { status: 503 });
  }

  try {
    const result = await provider.describe({
      kind: 'note',
      title: '',
      body: text.slice(0, 4000),
      url: null,
      unfurled: null,
      existingTags: [],
    });

    return NextResponse.json({
      kind: result.kind ?? 'note',
      title: result.title ?? null,
      tags: result.tags,
      dueAt: result.dueAt ?? null,
      description: result.description,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Classification failed.' },
      { status: 502 },
    );
  }
}
