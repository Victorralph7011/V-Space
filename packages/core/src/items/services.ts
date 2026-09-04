import {
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit as fsLimit,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';

import { getStorage } from '../firebase/index.ts';
import { itemDoc, itemsCol, mediaPath } from '../firebase/paths.ts';
import {
  dropUndefinedDeep,
  maybeDocToRecord,
  nowIso,
  snapshotToRecords,
} from '../shared/firestore.ts';
import { storedTokens } from '../search/tokenize.ts';
import { isPlaceholderTitle, mergeTags, shouldAcceptKind } from './enrichment-policy.ts';
import { classify, classifyUpload, type Classification } from '../classify/local.ts';
import type { EnrichmentResult, ID, Item, ItemDraft, ItemKind, ItemStatus } from '../types/index.ts';

/**
 * All writes to the item stream. The read side lives in `hooks.ts`.
 *
 * Every function here is safe to call offline: the Firebase SDK queues the
 * write locally, the local snapshot listener fires immediately with the
 * pending change, and it syncs when the connection returns. None of these
 * functions await the server, which is why capture feels instant.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Capture
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Turns raw text into a filed item.
 *
 * This is the front door of the whole application — the function behind the
 * chat box. It classifies locally (sub-millisecond, no network), writes the
 * document, and returns. Enrichment happens afterwards and separately, so that
 * a slow or absent Ralph can never delay or block a capture.
 */
export async function captureText(uid: ID, text: string): Promise<Item> {
  const classification = classify(text);
  return createItem(uid, draftFromClassification(classification, text));
}

/**
 * Uploads an image and files it.
 *
 * The Firestore document is written *before* the upload finishes, with the
 * media attached afterwards. That ordering means a screenshot appears in the
 * Image Store the instant you drop it, showing a placeholder while the bytes
 * travel, rather than the UI sitting still until a multi-megabyte PNG has
 * cleared a phone's upstream connection.
 */
export async function captureImage(
  uid: ID,
  file: Blob,
  fileName: string,
  caption = '',
): Promise<Item> {
  const contentType = file.type || 'image/jpeg';
  const classification = classifyUpload(fileName, contentType);

  const item = await createItem(uid, {
    ...draftFromClassification(classification, caption),
    kind: 'image',
    title: caption.trim() || classification.title,
    body: caption,
  });

  const extension = fileName.split('.').pop()?.toLowerCase() ?? 'jpg';
  const path = mediaPath(uid, item.id, extension);
  const storageRef = ref(getStorage(), path);

  // The item document above already exists and is visible in the Image Store
  // the instant this function is called — a failure past this point (Storage
  // not provisioned on the project yet, a network drop) must not leave that
  // row silently stuck on a placeholder forever. Surfacing it through the
  // same `enrichment` state machine every other failure uses means the UI
  // already knows how to render it, with a retry path, for free.
  try {
    await uploadBytes(storageRef, file, { contentType });
    const downloadUrl = await getDownloadURL(storageRef);

    const media = { storagePath: path, downloadUrl, sizeBytes: file.size, contentType };
    await updateDoc(itemDoc(uid, item.id), { media, updatedAt: nowIso() });

    return { ...item, media };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Image upload failed.';
    await markEnrichmentFailed(uid, item.id, message);
    return item;
  }
}

/** Fills in the fields a `Classification` determines, leaving the rest to defaults. */
function draftFromClassification(c: Classification, body: string): ItemDraft {
  return {
    kind: c.kind,
    title: c.title,
    body,
    url: c.url,
    tags: c.tags,
    source: c.source,
    dueAt: c.dueAt,
  };
}

/**
 * Writes an item, filling every unset field with a default.
 *
 * The id is generated client-side rather than by the server, which is what
 * lets the caller navigate to the item's detail page immediately and lets the
 * follow-up enrichment call name the document it is enriching before the write
 * has reached Firestore.
 */
export async function createItem(uid: ID, draft: ItemDraft): Promise<Item> {
  const reference = doc(itemsCol(uid));
  const timestamp = nowIso();

  const base: Omit<Item, 'searchTokens'> = {
    id: reference.id,
    kind: draft.kind,
    title: draft.title?.trim() || 'Untitled',
    body: draft.body ?? '',
    url: draft.url ?? null,
    media: draft.media ?? null,
    description: draft.description ?? '',
    tags: draft.tags ?? [],
    source: draft.source ?? 'manual',
    meta: draft.meta ?? {},
    dueAt: draft.dueAt ?? null,
    status: draft.status ?? 'active',
    pinned: draft.pinned ?? false,
    encrypted: draft.encrypted ?? false,
    enrichment: draft.enrichment ?? { state: 'idle' },
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const item: Item = { ...base, searchTokens: storedTokens(base) };

  // Not awaited against the server: Firestore resolves this from the local
  // cache first and syncs in the background, so the UI updates in one frame.
  void setDoc(reference, dropUndefinedDeep(stripId(item)));

  return item;
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Patches an item and keeps its search tokens honest.
 *
 * Tokens are recomputed here rather than left to the caller, because a title
 * edited without its tokens updated produces an item you can see but cannot
 * find — the exact failure this whole product exists to prevent.
 */
export async function updateItem(
  uid: ID,
  itemId: ID,
  patch: Partial<Omit<Item, 'id' | 'createdAt'>>,
): Promise<void> {
  const reference = itemDoc(uid, itemId);

  const touchesSearchable =
    'title' in patch ||
    'body' in patch ||
    'description' in patch ||
    'tags' in patch ||
    'url' in patch ||
    'kind' in patch ||
    'encrypted' in patch;

  let searchTokens: string[] | undefined;
  if (touchesSearchable) {
    const current = await getItem(uid, itemId);
    if (current) searchTokens = storedTokens({ ...current, ...patch });
  }

  await updateDoc(reference, {
    ...dropUndefinedDeep(patch),
    ...(searchTokens ? { searchTokens } : {}),
    updatedAt: nowIso(),
  });
}

export const setStatus = (uid: ID, itemId: ID, status: ItemStatus): Promise<void> =>
  updateItem(uid, itemId, { status });

export const setPinned = (uid: ID, itemId: ID, pinned: boolean): Promise<void> =>
  updateItem(uid, itemId, { pinned });

/** Reminders are completed, not deleted — a done deadline is still a record. */
export const completeReminder = (uid: ID, itemId: ID): Promise<void> =>
  setStatus(uid, itemId, 'done');

export const reopenReminder = (uid: ID, itemId: ID): Promise<void> =>
  setStatus(uid, itemId, 'active');

/**
 * Permanently removes an item and any bytes it owns in Storage.
 *
 * The Storage delete is best-effort: a failure there must not abort the
 * Firestore delete, or the item becomes undeletable from the UI. An orphaned
 * object costs a little quota; an undeletable row costs the user's trust.
 */
export async function deleteItem(uid: ID, itemId: ID): Promise<void> {
  const item = await getItem(uid, itemId);

  if (item?.media?.storagePath) {
    try {
      await deleteObject(ref(getStorage(), item.media.storagePath));
    } catch {
      // Already gone, or offline. Either way, proceed.
    }
  }

  await deleteDoc(itemDoc(uid, itemId));
}

// ─────────────────────────────────────────────────────────────────────────────
// Enrichment
// ─────────────────────────────────────────────────────────────────────────────

/** Marks an item as awaiting Ralph, so the card can show a working state. */
export const markEnrichmentPending = (uid: ID, itemId: ID): Promise<void> =>
  updateDoc(itemDoc(uid, itemId), { 'enrichment.state': 'pending', updatedAt: nowIso() });

/**
 * Applies Ralph's output.
 *
 * Deliberately narrow about what a model is allowed to overwrite. A
 * description and tags are additive and safe. A *title* is only replaced when
 * the local classifier had nothing better than a placeholder, and the `body` —
 * the thing you actually pasted — is never touched at all. Your own words are
 * never rewritten by a model.
 */
export async function applyEnrichment(
  uid: ID,
  itemId: ID,
  result: EnrichmentResult,
  model: string,
): Promise<void> {
  const current = await getItem(uid, itemId);
  if (!current) return;

  const patch: Partial<Item> = {
    description: result.description,
    tags: mergeTags(current.tags, result.tags),
    meta: { ...current.meta, ...result.meta },
    enrichment: { state: 'done', model, at: nowIso() },
  };

  if (result.title && isPlaceholderTitle(current.title)) patch.title = result.title;
  // A date extracted from an assignment is worth having, but never overrides
  // one already on the item — an explicit due date is the user's, not Ralph's.
  if (result.dueAt && !current.dueAt) patch.dueAt = result.dueAt;
  if (result.kind && shouldAcceptKind(current, result.kind)) patch.kind = result.kind;

  await updateItem(uid, itemId, patch);
}

export async function markEnrichmentFailed(
  uid: ID,
  itemId: ID,
  error: string,
): Promise<void> {
  await updateDoc(itemDoc(uid, itemId), {
    enrichment: { state: 'failed', error: error.slice(0, 300), at: nowIso() },
    updatedAt: nowIso(),
  });
}

export const markEnrichmentSkipped = (uid: ID, itemId: ID): Promise<void> =>
  updateDoc(itemDoc(uid, itemId), {
    enrichment: { state: 'skipped', at: nowIso() },
    updatedAt: nowIso(),
  });


// ─────────────────────────────────────────────────────────────────────────────
// Reads
// ─────────────────────────────────────────────────────────────────────────────

export async function getItem(uid: ID, itemId: ID): Promise<Item | null> {
  return maybeDocToRecord<Item>(await getDoc(itemDoc(uid, itemId)));
}

/** One-shot fetch of everything, used to seed the local search index at boot. */
export async function listItems(uid: ID, max = 5000): Promise<Item[]> {
  const snapshot = await getDocs(
    query(itemsCol(uid), orderBy('createdAt', 'desc'), fsLimit(max)),
  );
  return snapshotToRecords<Item>(snapshot);
}

/**
 * Cold-start keyword search, straight against Firestore.
 *
 * Only used on a device whose offline cache has not populated yet. It is much
 * weaker than the local index — `array-contains-any` caps at 30 values, cannot
 * rank, and matches whole tokens only — but it means a fresh install can search
 * before it has finished syncing, instead of showing an empty box.
 */
export async function searchItemsRemote(
  uid: ID,
  tokens: string[],
  kinds?: readonly ItemKind[],
): Promise<Item[]> {
  if (tokens.length === 0) return [];

  const constraints = [
    where('searchTokens', 'array-contains-any', tokens.slice(0, 30)),
    orderBy('createdAt', 'desc'),
    fsLimit(50),
  ];

  const snapshot = await getDocs(query(itemsCol(uid), ...constraints));
  const results = snapshotToRecords<Item>(snapshot);

  // Firestore cannot combine `array-contains-any` with another equality filter
  // on a different field, so the kind filter is applied here instead.
  return kinds?.length ? results.filter((i) => kinds.includes(i.kind)) : results;
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * A draft that may backdate its own `createdAt` — the one legitimate reason to
 * override it being the seed script, which needs items spread across the past
 * to make section lists and search look realistic rather than 200 rows all
 * timestamped in the same second.
 */
export type SeedItemDraft = ItemDraft & { createdAt?: Item['createdAt'] };

/** Bulk import, used by the seed script. Batched to stay under Firestore limits. */
export async function createItemsBulk(uid: ID, drafts: SeedItemDraft[]): Promise<number> {
  const BATCH_LIMIT = 400;
  let written = 0;

  for (let offset = 0; offset < drafts.length; offset += BATCH_LIMIT) {
    const batch = writeBatch(itemsCol(uid).firestore);

    for (const draft of drafts.slice(offset, offset + BATCH_LIMIT)) {
      const reference = doc(itemsCol(uid));
      const timestamp = draft.createdAt ?? nowIso();
      const base = {
        id: reference.id,
        kind: draft.kind,
        title: draft.title?.trim() || 'Untitled',
        body: draft.body ?? '',
        url: draft.url ?? null,
        media: draft.media ?? null,
        description: draft.description ?? '',
        tags: draft.tags ?? [],
        source: draft.source ?? 'manual',
        meta: draft.meta ?? {},
        dueAt: draft.dueAt ?? null,
        status: draft.status ?? ('active' as ItemStatus),
        pinned: draft.pinned ?? false,
        encrypted: draft.encrypted ?? false,
        enrichment: draft.enrichment ?? { state: 'idle' as const },
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      batch.set(reference, dropUndefinedDeep(stripId({ ...base, searchTokens: storedTokens(base) })));
      written++;
    }

    await batch.commit();
  }

  return written;
}

/** Firestore stores the id in the path, so writing it into the body too would
 *  duplicate it and let the two disagree after a copy. */
function stripId<T extends { id: unknown }>(record: T): Omit<T, 'id'> {
  const { id: _id, ...rest } = record;
  return rest;
}
