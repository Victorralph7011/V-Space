import { onSnapshot, orderBy, query } from 'firebase/firestore';
import type { Unsubscribe } from 'firebase/firestore';

import { itemsCol } from '../firebase/paths.ts';
import { docToRecord } from '../shared/firestore.ts';
import { SearchIndex } from '../search/index.ts';
import type { ID, Item } from '../types/index.ts';

/**
 * One live subscription to the entire item stream, shared by the whole app.
 *
 * The obvious design would be a listener per section — one for links, one for
 * prompts, and so on. This is deliberately not that, for three reasons that all
 * point the same way:
 *
 *   1. Search has to see everything at once. A per-section listener would mean
 *      the global search box could only find what happened to be on screen.
 *   2. Five listeners bill five times for the same documents and re-deliver
 *      them on every tab switch. One listener reads each document once.
 *   3. Sections become pure client-side filters over an array already in
 *      memory, so switching sections is instant and works offline.
 *
 * A personal archive is small — a few thousand items, a few megabytes. Holding
 * all of it in memory is not a compromise; it is what makes the app feel fast.
 * If a single account ever outgrew that, the fix is a windowed listener here,
 * and nothing outside this file would change.
 */

export interface ItemsState {
  items: readonly Item[];
  byId: ReadonlyMap<ID, Item>;
  index: SearchIndex;
  /** False until the first snapshot lands — distinguishes "empty" from "loading". */
  loaded: boolean;
  error: Error | null;
}

const EMPTY_STATE: ItemsState = {
  items: [],
  byId: new Map(),
  index: new SearchIndex(),
  loaded: false,
  error: null,
};

type Listener = () => void;

class ItemStore {
  private state: ItemsState = EMPTY_STATE;
  private listeners = new Set<Listener>();
  private unsubscribe: Unsubscribe | null = null;
  private uid: ID | null = null;

  getSnapshot = (): ItemsState => this.state;

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  /**
   * Begins listening for a signed-in user. Idempotent per uid so that React
   * re-renders and Fast Refresh do not stack duplicate listeners; switching
   * accounts tears the old one down first.
   */
  start(uid: ID): void {
    if (this.uid === uid && this.unsubscribe) return;
    this.stop();
    this.uid = uid;

    const index = new SearchIndex();
    let seeded = false;

    this.unsubscribe = onSnapshot(
      query(itemsCol(uid), orderBy('createdAt', 'desc')),
      (snapshot) => {
        const items = snapshot.docs.map((d) => docToRecord<Item>(d));

        // The first snapshot is a full rebuild; after that only what actually
        // changed is re-indexed. It matters because a snapshot fires on every
        // single write — including each keystroke-completed capture and each of
        // the three enrichment write-backs per link — and re-indexing the whole
        // archive on every one of those would put a visible stutter into typing.
        if (!seeded) {
          index.rebuild(items);
          seeded = true;
        } else {
          for (const change of snapshot.docChanges()) {
            if (change.type === 'removed') index.remove(change.doc.id);
            else index.update(docToRecord<Item>(change.doc));
          }
        }

        this.state = {
          items,
          byId: new Map(items.map((i) => [i.id, i])),
          index,
          loaded: true,
          error: null,
        };
        this.emit();
      },
      (error) => {
        this.state = { ...this.state, loaded: true, error };
        this.emit();
      },
    );
  }

  stop(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.uid = null;
    this.state = { ...EMPTY_STATE, index: new SearchIndex() };
    this.emit();
  }

  private emit(): void {
    for (const listener of this.listeners) listener();
  }
}

export const itemStore = new ItemStore();
