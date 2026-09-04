import 'server-only';
import {
  dropUndefinedDeep,
  isPlaceholderTitle,
  mergeTags,
  shouldAcceptKind,
  storedTokens,
  type EnrichmentResult,
  type ID,
  type Item,
  type UserSettings,
} from '@vspace/core';
import { adminDb } from './firebase-admin';

/**
 * The server-side mirror of the enrichment-writing half of
 * `packages/core/src/items/services.ts`.
 *
 * It cannot simply *be* that file: the client functions there are built on
 * the `firebase/firestore` client SDK, bound to whatever `configureFirebase()`
 * wired up in the browser, and a Vercel function has no such thing — it holds
 * a service account and talks through `firebase-admin` instead. Two different
 * SDKs, so two thin write layers. What is not duplicated is the *policy* —
 * which title counts as a placeholder, whether a proposed kind is trustworthy,
 * how tags merge — all of that is the same pure functions from
 * `enrichment-policy.ts`, imported here rather than re-derived, so the browser
 * and the server can never quietly disagree about what a model is allowed to
 * change.
 */
const nowIso = (): string => new Date().toISOString();

function itemRef(uid: ID, itemId: ID) {
  return adminDb().collection('users').doc(uid).collection('items').doc(itemId);
}

function userRef(uid: ID) {
  return adminDb().collection('users').doc(uid);
}

export async function getItemAdmin(uid: ID, itemId: ID): Promise<Item | null> {
  const snap = await itemRef(uid, itemId).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...snap.data() } as Item;
}

export async function getUserSettingsAdmin(uid: ID): Promise<UserSettings | null> {
  const snap = await userRef(uid).get();
  const data = snap.data();
  return data?.settings ?? null;
}

export async function markEnrichmentPendingAdmin(uid: ID, itemId: ID): Promise<void> {
  await itemRef(uid, itemId).update({ 'enrichment.state': 'pending', updatedAt: nowIso() });
}

export async function markEnrichmentSkippedAdmin(uid: ID, itemId: ID): Promise<void> {
  await itemRef(uid, itemId).update({
    enrichment: { state: 'skipped', at: nowIso() },
    updatedAt: nowIso(),
  });
}

export async function markEnrichmentFailedAdmin(uid: ID, itemId: ID, error: string): Promise<void> {
  await itemRef(uid, itemId).update({
    enrichment: { state: 'failed', error: error.slice(0, 300), at: nowIso() },
    updatedAt: nowIso(),
  });
}

/**
 * Applies the fast half of enrichment — real title, thumbnail, site name from
 * `/api/unfurl` — as its own write, separate from the slower AI description.
 *
 * This is what makes a pasted reel feel responsive rather than merely
 * eventually-correct: the placeholder "Instagram reel" and blank thumbnail are
 * replaced within a few hundred milliseconds, while the description — which
 * takes a couple of seconds because it waits on the model — catches up after.
 * Two writes instead of one, deliberately, so the Firestore listener that
 * feeds every card fires twice with each half as soon as it's ready.
 */
export async function applyUnfurlAdmin(
  uid: ID,
  itemId: ID,
  unfurled: { title: string | null; imageUrl: string | null; siteName: string | null },
): Promise<void> {
  const current = await getItemAdmin(uid, itemId);
  if (!current) return;

  const patch: Partial<Item> = {};

  if (unfurled.title && isPlaceholderTitle(current.title)) patch.title = unfurled.title;
  if (unfurled.siteName) patch.meta = { ...current.meta, siteName: unfurled.siteName };
  // Only a thumbnail *reference*, never an upload — nothing was written to
  // Storage here, so there is no `storagePath` and this item owns no bytes to
  // clean up later if the item is deleted.
  if (unfurled.imageUrl && !current.media) {
    patch.media = { storagePath: '', downloadUrl: unfurled.imageUrl, thumbUrl: unfurled.imageUrl };
  }

  if (Object.keys(patch).length === 0) return;

  const merged = { ...current, ...patch };
  await itemRef(uid, itemId).update(
    dropUndefinedDeep({ ...patch, searchTokens: storedTokens(merged), updatedAt: nowIso() }),
  );
}

/** Same acceptance rules as the client's `applyEnrichment` — see enrichment-policy.ts. */
export async function applyEnrichmentAdmin(
  uid: ID,
  itemId: ID,
  result: EnrichmentResult,
  model: string,
): Promise<void> {
  const current = await getItemAdmin(uid, itemId);
  if (!current) return;

  const patch: Partial<Item> = {
    description: result.description,
    tags: mergeTags(current.tags, result.tags),
    meta: { ...current.meta, ...result.meta },
    enrichment: { state: 'done', model, at: nowIso() },
  };

  if (result.title && isPlaceholderTitle(current.title)) patch.title = result.title;
  if (result.dueAt && !current.dueAt) patch.dueAt = result.dueAt;
  if (result.kind && shouldAcceptKind(current, result.kind)) patch.kind = result.kind;

  const merged = { ...current, ...patch };
  await itemRef(uid, itemId).update(
    dropUndefinedDeep({
      ...patch,
      searchTokens: storedTokens(merged),
      updatedAt: nowIso(),
    }),
  );
}
