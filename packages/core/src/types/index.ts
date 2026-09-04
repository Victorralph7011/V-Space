/**
 * The V-Space domain model.
 *
 * One shape — `Item` — carries every kind of thing you capture. The five
 * sections in the UI are queries over this single collection, not five
 * different types. That is the whole architecture in one sentence, and the
 * reason a link, a prompt, a screenshot and an assignment deadline can all be
 * pasted into the same chat box.
 */

export type ID = string;

/** ISO 8601 string. Never a Firestore `Timestamp` — see `shared/firestore.ts`. */
export type IsoDate = string;

// ─────────────────────────────────────────────────────────────────────────────
// Item
// ─────────────────────────────────────────────────────────────────────────────

/**
 * What a captured thing *is*. Drives which section it appears in, which card
 * renders it, and how Ralph is prompted to describe it.
 *
 * `note` is the fallback for text that is not recognisably anything else, so
 * capture can never fail — there is always a kind to land in.
 */
export type ItemKind =
  | 'link'
  | 'prompt'
  | 'image'
  | 'idea'
  | 'reminder'
  | 'note'
  | 'code'
  | 'secret';

/** Where it came from. Purely for display and for Ralph's prompt context. */
export type ItemSource =
  | 'instagram'
  | 'youtube'
  | 'x'
  | 'github'
  | 'leetcode'
  | 'reddit'
  | 'linkedin'
  | 'web'
  | 'upload'
  | 'manual';

export type ItemStatus = 'active' | 'done' | 'archived';

/**
 * Enrichment is tracked as an explicit state machine rather than a boolean
 * because every one of these states renders differently, and because a failure
 * must be visible and retryable instead of silently leaving a blank
 * description. `skipped` is the honest state for encrypted items and for when
 * the user has turned Ralph off — distinct from `failed`, which invites a retry.
 */
export type EnrichmentState = 'idle' | 'pending' | 'done' | 'failed' | 'skipped';

export interface Enrichment {
  state: EnrichmentState;
  /** Which model wrote the description, for provenance when quality varies. */
  model?: string;
  at?: IsoDate;
  error?: string;
}

export interface ItemMedia {
  storagePath: string;
  downloadUrl: string;
  width?: number;
  height?: number;
  /** Remote thumbnail from an unfurl, when we did not upload the bytes. */
  thumbUrl?: string;
  sizeBytes?: number;
  contentType?: string;
}

export interface ItemMeta {
  siteName?: string;
  author?: string;
  /** Seconds, for video links. */
  duration?: number;
  faviconUrl?: string;
  /** Publication date reported by the page, distinct from when you saved it. */
  publishedAt?: IsoDate;
}

export interface Item {
  id: ID;
  kind: ItemKind;

  /** Always present. Falls back to a derived label so no card is ever untitled. */
  title: string;

  /**
   * The payload: prompt text, note body, idea, code, or — when `encrypted` is
   * true — base64 ciphertext that only this user's device can open.
   */
  body: string;

  url: string | null;
  media: ItemMedia | null;

  /** Written by Ralph, editable by you. Empty until enrichment lands. */
  description: string;

  tags: string[];
  source: ItemSource;
  meta: ItemMeta;

  /** Set on reminders, and on any item Ralph found a date inside. */
  dueAt: IsoDate | null;

  status: ItemStatus;
  pinned: boolean;

  /** True ⇒ `body` is ciphertext. Enrichment refuses these; search skips the body. */
  encrypted: boolean;

  enrichment: Enrichment;

  /**
   * Lowercased keyword tokens for the Firestore cold-start query. The warm
   * search path uses the in-memory index and ignores this field entirely.
   */
  searchTokens: string[];

  createdAt: IsoDate;
  updatedAt: IsoDate;
}

/** Fields a caller supplies when capturing. Everything else is derived. */
export type ItemDraft = Partial<Omit<Item, 'id' | 'createdAt' | 'updatedAt'>> &
  Pick<Item, 'kind'>;

/** Fields Ralph is allowed to write back. Deliberately narrow. */
export interface EnrichmentResult {
  title?: string;
  description: string;
  tags: string[];
  kind?: ItemKind;
  dueAt?: IsoDate | null;
  meta?: ItemMeta;
}

// ─────────────────────────────────────────────────────────────────────────────
// Chat
// ─────────────────────────────────────────────────────────────────────────────

export type MessageRole = 'user' | 'ralph';

/**
 * The chat timeline. A message is a *record of the act of capturing*; the Item
 * is the thing captured. Keeping them separate is what lets you delete a stray
 * message without losing the reel, and lets Ralph reply inline without
 * inventing a fake item.
 */
export interface Message {
  id: ID;
  role: MessageRole;
  text: string;
  /** The item this message produced or refers to. */
  itemId: ID | null;
  createdAt: IsoDate;
}

// ─────────────────────────────────────────────────────────────────────────────
// User
// ─────────────────────────────────────────────────────────────────────────────

export type ThemePreference = 'light' | 'dark' | 'system';

export interface UserSettings {
  theme: ThemePreference;
  /** Master switch for Ralph. Off ⇒ every item enriches to `skipped`. */
  aiEnabled: boolean;
  /** How long before `dueAt` a reminder notification fires. */
  reminderLeadMinutes: number;
  /**
   * Random per-user salt for vault key derivation, created the first time a
   * secret is saved. Public by nature — a salt is not a secret, it exists to
   * make precomputed-table attacks useless.
   */
  vaultSalt: string | null;
  /**
   * A known plaintext, encrypted under the vault key, stored purely so a
   * typo'd passphrase can be caught immediately instead of a few weeks later.
   *
   * Without this, re-encrypting under a mistyped passphrase succeeds silently
   * — GCM does not know it was given the wrong key — and every secret saved
   * before that typo becomes unreadable forever, discovered only the next time
   * one is opened. Verifying against this canary on every unlock turns that
   * into an immediate "wrong passphrase" instead of a silent, delayed loss.
   */
  vaultCheck: string | null;
}

export interface VUser {
  id: ID;
  displayName: string;
  email: string;
  photoURL: string | null;
  settings: UserSettings;
  createdAt: IsoDate;
}

export const DEFAULT_SETTINGS: UserSettings = {
  theme: 'system',
  aiEnabled: true,
  reminderLeadMinutes: 30,
  vaultSalt: null,
  vaultCheck: null,
};
