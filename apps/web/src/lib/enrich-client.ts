'use client';

import { getAuth } from '@vspace/core';

/**
 * Fires enrichment for a freshly captured item and forgets about it.
 *
 * Deliberately not awaited by any caller. The item is already filed and
 * visible — from `captureText`/`captureImage` in @vspace/core — by the time
 * this runs, so nothing in the UI is waiting on the response. `/api/enrich`
 * updates the Firestore document directly; this function's only job is to ask
 * it to start, and the live item-stream listener (`itemStore`) picks up the
 * result the moment it lands, wherever that item is currently rendered.
 *
 * Failures are swallowed here on purpose. A dead network or an exhausted free
 * quota must never surface as an error toast over a capture that already
 * succeeded — the item is fine; it just does not have a description yet, which
 * `enrichment.state` already communicates in the UI.
 */
export async function triggerEnrichment(itemId: string): Promise<void> {
  const user = getAuth().currentUser;
  if (!user) return;

  try {
    const token = await user.getIdToken();
    await fetch('/api/enrich', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ itemId }),
    });
  } catch {
    // Best-effort. The item keeps its local classification either way.
  }
}
