import { getAuth } from '@vspace/core';

/**
 * The mobile counterpart to apps/web's enrich-client.ts.
 *
 * Every `/api/*` route lives in `apps/web`, deployed once on Vercel — the
 * plan's API layer was designed to be called from both platforms rather than
 * duplicated, so the mobile app is simply a second client of the same
 * endpoints. `EXPO_PUBLIC_API_URL` points at that deployment (e.g.
 * `https://vspace.vercel.app`); local development points it at the machine
 * running `npm run dev`, reachable from a physical device on the same network
 * or from an emulator via its host-loopback address.
 */
const API_BASE = process.env.EXPO_PUBLIC_API_URL;

export async function triggerEnrichment(itemId: string): Promise<void> {
  const user = getAuth().currentUser;
  if (!user || !API_BASE) return;

  try {
    const token = await user.getIdToken();
    await fetch(`${API_BASE}/api/enrich`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ itemId }),
    });
  } catch {
    // Best-effort, same as web — the item is already filed either way.
  }
}
