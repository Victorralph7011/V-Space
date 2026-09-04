import { NextResponse } from 'next/server';
import { getAiProvider } from '@/lib/ai/provider';

/**
 * Lets the UI show an honest "Ralph is offline" state instead of every
 * capture silently sitting at `enrichment.state: 'pending'` forever with no
 * explanation. Deliberately does not call the model — `isConfigured()` only
 * checks that a key is present, so this check costs nothing against the free
 * quota no matter how often the client polls it.
 */
export async function GET() {
  const provider = await getAiProvider();
  return NextResponse.json({
    ok: true,
    ai: { provider: provider.name, configured: provider.isConfigured() },
  });
}
