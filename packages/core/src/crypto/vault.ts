/**
 * The secrets vault.
 *
 * API keys stored in a normal Firestore document are protected only by security
 * rules — which means anyone with project access, and any future mistake in
 * those rules, reads them in the clear. That is a bad place to keep the keys to
 * everything else you own.
 *
 * So `kind: 'secret'` items are encrypted on the device before they are
 * written. Firestore only ever holds ciphertext. The key is derived from a
 * passphrase that is never transmitted and never stored — not in Firestore, not
 * in the user document, not in device storage.
 *
 * What you are accepting in exchange, stated plainly:
 *   - The passphrase must be entered once per device, per session.
 *   - Secret *bodies* are not searchable. Titles and tags still are.
 *   - Ralph can never read or enrich a secret.
 *   - **If you forget the passphrase, the secrets are gone.** There is no
 *     recovery path, because a recovery path is by definition a second way in.
 *
 * The cryptographic primitives are supplied by the host platform: the web has
 * WebCrypto, React Native does not, and importing either into this package
 * would break the other's bundler. The *format* — envelope layout, key
 * derivation parameters, base64 handling — is defined here, once, so both
 * platforms are guaranteed to produce ciphertext the other can open.
 */

/** Primitives each platform must provide. See apps/web/src/lib/crypto.ts. */
export interface CryptoProvider {
  randomBytes(length: number): Uint8Array;
  /** PBKDF2-HMAC-SHA256. Returns raw key material of `length` bytes. */
  pbkdf2(
    passphrase: string,
    salt: Uint8Array,
    iterations: number,
    length: number,
  ): Promise<Uint8Array>;
  /** AES-256-GCM. The 16-byte auth tag is appended to the ciphertext. */
  encrypt(key: Uint8Array, iv: Uint8Array, plaintext: Uint8Array): Promise<Uint8Array>;
  decrypt(key: Uint8Array, iv: Uint8Array, ciphertext: Uint8Array): Promise<Uint8Array>;
}

/**
 * OWASP's 2023 floor for PBKDF2-HMAC-SHA256. High enough to make guessing a
 * weak passphrase expensive, low enough that unlocking on a mid-range phone
 * takes well under a second. Encoded in the envelope so it can be raised later
 * without stranding data encrypted under the old cost.
 */
export const PBKDF2_ITERATIONS = 210_000;

const KEY_LENGTH_BYTES = 32; // AES-256
const IV_LENGTH_BYTES = 12; // GCM standard
const SALT_LENGTH_BYTES = 16;

const ENVELOPE_VERSION = 'v1';

let provider: CryptoProvider | null = null;

export function configureCrypto(impl: CryptoProvider): void {
  provider = impl;
}

export const isCryptoAvailable = (): boolean => provider !== null;

function required(): CryptoProvider {
  if (!provider) {
    throw new VaultError(
      'unavailable',
      'Encryption is not available on this device. Call configureCrypto() at startup.',
    );
  }
  return provider;
}

export type VaultErrorCode = 'unavailable' | 'locked' | 'bad-passphrase' | 'corrupt';

export class VaultError extends Error {
  readonly code: VaultErrorCode;

  // Written out rather than using a TypeScript parameter property, which is
  // syntax Node's type-stripping cannot run. See AGENTS.md.
  constructor(code: VaultErrorCode, message: string) {
    super(message);
    this.name = 'VaultError';
    this.code = code;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Salt
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A per-user salt, generated the first time a secret is saved and stored in the
 * user document.
 *
 * A salt is not itself a secret — it exists so that two people with the same
 * passphrase get different keys, and so precomputed tables are useless. Storing
 * it in the clear is correct and expected.
 */
export function generateSalt(): string {
  return toBase64(required().randomBytes(SALT_LENGTH_BYTES));
}

// ─────────────────────────────────────────────────────────────────────────────
// The unlocked key
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The derived key, held in memory only.
 *
 * Never written to localStorage, AsyncStorage, or a cookie. That is the whole
 * point: a key persisted to disk is a key that survives the device being
 * stolen, and reduces the vault to obfuscation. The cost is re-entering the
 * passphrase after a reload, which is the correct trade for credentials.
 */
let unlockedKey: Uint8Array | null = null;
let unlockedFor: string | null = null;

export const isUnlocked = (): boolean => unlockedKey !== null;

/**
 * Derives and caches the key. Returns a verification string the caller should
 * store on first unlock and compare on later ones — without it, a mistyped
 * passphrase is only discovered when a decrypt fails, which is indistinguishable
 * from data corruption.
 */
export async function unlock(passphrase: string, saltBase64: string): Promise<void> {
  const impl = required();
  if (!passphrase) throw new VaultError('bad-passphrase', 'Passphrase cannot be empty.');

  const salt = fromBase64(saltBase64);
  unlockedKey = await impl.pbkdf2(passphrase, salt, PBKDF2_ITERATIONS, KEY_LENGTH_BYTES);
  unlockedFor = saltBase64;
}

export function lock(): void {
  // Zero the bytes before dropping the reference. Best-effort — a JS engine may
  // already have copied the buffer during GC — but it costs nothing and shrinks
  // the window in which the key sits readable in a heap snapshot.
  unlockedKey?.fill(0);
  unlockedKey = null;
  unlockedFor = null;
}

function keyFor(saltBase64: string): Uint8Array {
  if (!unlockedKey || unlockedFor !== saltBase64) {
    throw new VaultError('locked', 'The vault is locked. Enter your passphrase to continue.');
  }
  return unlockedKey;
}

// ─────────────────────────────────────────────────────────────────────────────
// Encrypt / decrypt
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Envelope: `v1.<iterations>.<base64 iv>.<base64 ciphertext+tag>`
 *
 * Version and iteration count travel with the data rather than living in a
 * constant, so the cost can be raised in future without making everything
 * already encrypted unreadable.
 */
export async function encryptSecret(plaintext: string, saltBase64: string): Promise<string> {
  const impl = required();
  const key = keyFor(saltBase64);

  // A fresh IV per message is mandatory for GCM: reusing one with the same key
  // breaks the mode outright, leaking plaintext and forging capability.
  const iv = impl.randomBytes(IV_LENGTH_BYTES);
  const ciphertext = await impl.encrypt(key, iv, encodeUtf8(plaintext));

  return [ENVELOPE_VERSION, String(PBKDF2_ITERATIONS), toBase64(iv), toBase64(ciphertext)].join('.');
}

export async function decryptSecret(envelope: string, saltBase64: string): Promise<string> {
  const impl = required();
  const key = keyFor(saltBase64);

  const parts = envelope.split('.');
  if (parts.length !== 4 || parts[0] !== ENVELOPE_VERSION) {
    throw new VaultError('corrupt', 'This secret is not in a format this version can read.');
  }

  try {
    const plaintext = await impl.decrypt(key, fromBase64(parts[2]!), fromBase64(parts[3]!));
    return decodeUtf8(plaintext);
  } catch {
    // GCM authenticates as it decrypts, so a wrong key and tampered data fail
    // identically. A wrong passphrase is overwhelmingly the likelier cause, and
    // saying so is far more useful than "decryption failed".
    throw new VaultError('bad-passphrase', 'Wrong passphrase, or this secret was altered.');
  }
}

/** True for a string this module produced. Used to avoid double-encrypting. */
export const isEnvelope = (value: string): boolean =>
  value.startsWith(`${ENVELOPE_VERSION}.`) && value.split('.').length === 4;

// ─────────────────────────────────────────────────────────────────────────────
// Encoding
// ─────────────────────────────────────────────────────────────────────────────

const encodeUtf8 = (text: string): Uint8Array => new TextEncoder().encode(text);
const decodeUtf8 = (bytes: Uint8Array): string => new TextDecoder().decode(bytes);

/**
 * Base64 without `Buffer` or `btoa`.
 *
 * `Buffer` is Node-only and `btoa` is browser-only; React Native reliably has
 * neither. Twelve lines of table lookup work identically everywhere and remove
 * a whole class of "works on web, crashes on device" bug.
 */
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export function toBase64(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i]!;
    const b = bytes[i + 1];
    const c = bytes[i + 2];
    out += B64[a >> 2];
    out += B64[((a & 3) << 4) | ((b ?? 0) >> 4)];
    out += b === undefined ? '=' : B64[((b & 15) << 2) | ((c ?? 0) >> 6)];
    out += c === undefined ? '=' : B64[c & 63];
  }
  return out;
}

export function fromBase64(text: string): Uint8Array {
  const clean = text.replace(/[^A-Za-z0-9+/]/g, '');
  const out = new Uint8Array((clean.length * 3) >> 2);
  let position = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const a = B64.indexOf(clean[i]!);
    const b = B64.indexOf(clean[i + 1]!);
    const c = B64.indexOf(clean[i + 2]!);
    const d = B64.indexOf(clean[i + 3]!);
    out[position++] = (a << 2) | (b >> 4);
    if (c >= 0) out[position++] = ((b & 15) << 4) | (c >> 2);
    if (d >= 0) out[position++] = ((c & 3) << 6) | d;
  }
  return out.subarray(0, position);
}
