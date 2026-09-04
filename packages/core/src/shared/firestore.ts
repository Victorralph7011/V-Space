import type {
  DocumentData,
  DocumentSnapshot,
  QueryDocumentSnapshot,
  QuerySnapshot,
} from 'firebase/firestore';

/**
 * Firestore assigns a document's id at the path level, so it is not in
 * `.data()`. Every app-facing type (`Item`, `Message`, `VUser`) declares `id`,
 * which means it has to be merged back in on every single read. This is that
 * merge, in one place, applied consistently.
 */
export function docToRecord<T>(snap: QueryDocumentSnapshot<DocumentData>): T {
  return { id: snap.id, ...snap.data() } as T;
}

export function maybeDocToRecord<T>(snap: DocumentSnapshot<DocumentData>): T | null {
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as T;
}

export function snapshotToRecords<T>(snap: QuerySnapshot<DocumentData>): T[] {
  return snap.docs.map((d) => docToRecord<T>(d));
}

/**
 * Firestore rejects `undefined` values outright. Optional fields on our types
 * are genuinely absent rather than null, so every write path has to strip them
 * — building the object and then filtering is far less error-prone than
 * conditionally assembling it at each call site.
 */
export function dropUndefined<T extends object>(input: T): Partial<T> {
  const out: Partial<T> = {};
  for (const key of Object.keys(input) as (keyof T)[]) {
    if (input[key] !== undefined) out[key] = input[key];
  }
  return out;
}

/** Recursive variant, for nested objects like `meta` and `enrichment`. */
export function dropUndefinedDeep<T>(input: T): T {
  if (Array.isArray(input)) return input.map(dropUndefinedDeep) as unknown as T;
  if (input === null || typeof input !== 'object') return input;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (v !== undefined) out[k] = dropUndefinedDeep(v);
  }
  return out as T;
}

/**
 * Every timestamp in the domain model is a plain ISO string, not a Firestore
 * `Timestamp`.
 *
 * The reason is that these values cross three runtimes — Metro, the Next.js
 * server, and the Next.js client — plus the local search index and the
 * on-device notification scheduler. A `Timestamp` is a class instance that has
 * to be rehydrated at each boundary, and forgetting to rehydrate it once
 * produces a crash far from the cause. A string is a string everywhere.
 *
 * The cost is that ordering depends on the writing device's clock rather than
 * the server's. For a single-user personal archive that is an acceptable
 * trade; if a device's clock is badly wrong, one item sorts oddly and nothing
 * breaks. Revisit with `serverTimestamp()` only if V-Space ever grows
 * multi-writer collections.
 */
export const nowIso = (): IsoLike => new Date().toISOString();

type IsoLike = string;
