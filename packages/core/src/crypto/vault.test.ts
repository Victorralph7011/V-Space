import { test } from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';

import {
  configureCrypto,
  decryptSecret,
  encryptSecret,
  fromBase64,
  generateSalt,
  isEnvelope,
  isUnlocked,
  lock,
  toBase64,
  unlock,
  VaultError,
  type CryptoProvider,
} from './vault.ts';

/**
 * Exercised through a real WebCrypto implementation (Node's), so these test the
 * actual AES-GCM/PBKDF2 path the browser will take — not a stub. The mobile
 * provider has to satisfy the same interface, which is what guarantees a secret
 * encrypted on the phone opens on the laptop.
 */
// TypeScript's DOM lib (what `vault.ts` is written against, since it targets
// the browser at runtime) and @types/node's `webcrypto` disagree on the exact
// generic shape of a Uint8Array's backing buffer — DOM wants `Uint8Array
// <ArrayBuffer>`, Node's types give `Uint8Array<ArrayBufferLike>`. Both are the
// same bytes at runtime — Node's WebCrypto implementation *is* the standard —
// so this narrow cast bridges two type libraries describing one real API,
// applied at each boundary crossing rather than risked as a blanket `any`.
const subtle = webcrypto.subtle as unknown as SubtleCrypto;
const asBufferSource = (bytes: Uint8Array): BufferSource => bytes as unknown as BufferSource;

const nodeProvider: CryptoProvider = {
  randomBytes: (length) => webcrypto.getRandomValues(new Uint8Array(length)),

  async pbkdf2(passphrase, salt, iterations, length) {
    const base = await subtle.importKey('raw', new TextEncoder().encode(passphrase), 'PBKDF2', false, [
      'deriveBits',
    ]);
    const bits = await subtle.deriveBits(
      { name: 'PBKDF2', salt: asBufferSource(salt), iterations, hash: 'SHA-256' },
      base,
      length * 8,
    );
    return new Uint8Array(bits);
  },

  async encrypt(key, iv, plaintext) {
    const k = await subtle.importKey('raw', asBufferSource(key), 'AES-GCM', false, ['encrypt']);
    const result = await subtle.encrypt({ name: 'AES-GCM', iv: asBufferSource(iv) }, k, asBufferSource(plaintext));
    return new Uint8Array(result);
  },

  async decrypt(key, iv, ciphertext) {
    const k = await subtle.importKey('raw', asBufferSource(key), 'AES-GCM', false, ['decrypt']);
    const result = await subtle.decrypt({ name: 'AES-GCM', iv: asBufferSource(iv) }, k, asBufferSource(ciphertext));
    return new Uint8Array(result);
  },
};

configureCrypto(nodeProvider);

// ── base64 ───────────────────────────────────────────────────────────────────

test('base64 round-trips at every padding length', () => {
  // Lengths 0..64 cover all three padding cases many times over. A hand-written
  // codec that is wrong on one padding case is wrong on roughly a third of all
  // real ciphertexts, which would be an intermittent, baffling failure.
  for (let length = 0; length <= 64; length++) {
    const bytes = new Uint8Array(length);
    for (let i = 0; i < length; i++) bytes[i] = (i * 37 + length) % 256;
    const restored = fromBase64(toBase64(bytes));
    assert.deepEqual([...restored], [...bytes], `length ${length}`);
  }
});

test('base64 output matches the platform implementation exactly', () => {
  for (let length = 1; length <= 32; length++) {
    const bytes = webcrypto.getRandomValues(new Uint8Array(length));
    assert.equal(toBase64(bytes), Buffer.from(bytes).toString('base64'), `length ${length}`);
  }
});

test('base64 decodes what the platform encoded', () => {
  const bytes = webcrypto.getRandomValues(new Uint8Array(45));
  const platform = Buffer.from(bytes).toString('base64');
  assert.deepEqual([...fromBase64(platform)], [...bytes]);
});

// ── vault ────────────────────────────────────────────────────────────────────

const SALT = (() => {
  lock();
  return generateSalt();
})();

test('a secret round-trips through encrypt and decrypt', async () => {
  await unlock('correct horse battery staple', SALT);
  const secret = 'sk-ant-api03-abcdefghijklmnopqrstuvwxyz';

  const envelope = await encryptSecret(secret, SALT);
  assert.ok(isEnvelope(envelope));
  assert.ok(!envelope.includes('sk-ant'), 'the plaintext must not survive in the envelope');

  assert.equal(await decryptSecret(envelope, SALT), secret);
});

test('unicode survives the round trip', async () => {
  await unlock('passphrase', SALT);
  const text = 'clé 🔑 パスワード — em-dash';
  assert.equal(await decryptSecret(await encryptSecret(text, SALT), SALT), text);
});

test('every encryption uses a fresh IV', async () => {
  await unlock('passphrase', SALT);
  // Reusing an IV under one key breaks GCM outright. Encrypting the same
  // plaintext twice must therefore never produce the same envelope.
  const a = await encryptSecret('same input', SALT);
  const b = await encryptSecret('same input', SALT);
  assert.notEqual(a, b);
  assert.equal(await decryptSecret(a, SALT), await decryptSecret(b, SALT));
});

test('the wrong passphrase is rejected, not silently mis-decrypted', async () => {
  await unlock('the right one', SALT);
  const envelope = await encryptSecret('top secret', SALT);

  await unlock('the wrong one', SALT);
  await assert.rejects(
    () => decryptSecret(envelope, SALT),
    (error: VaultError) => error.code === 'bad-passphrase',
  );
});

test('tampered ciphertext is detected by the auth tag', async () => {
  await unlock('passphrase', SALT);
  const envelope = await encryptSecret('top secret', SALT);

  const parts = envelope.split('.');
  const bytes = fromBase64(parts[3]!);
  bytes[0] = bytes[0]! ^ 0xff;
  const tampered = [parts[0], parts[1], parts[2], toBase64(bytes)].join('.');

  await assert.rejects(() => decryptSecret(tampered, SALT));
});

test('locking makes secrets unreadable until unlocked again', async () => {
  await unlock('passphrase', SALT);
  const envelope = await encryptSecret('top secret', SALT);

  lock();
  assert.equal(isUnlocked(), false);
  await assert.rejects(
    () => decryptSecret(envelope, SALT),
    (error: VaultError) => error.code === 'locked',
  );

  await unlock('passphrase', SALT);
  assert.equal(await decryptSecret(envelope, SALT), 'top secret');
});

test('a different salt yields a different key even with the same passphrase', async () => {
  const otherSalt = generateSalt();
  await unlock('passphrase', SALT);
  const envelope = await encryptSecret('top secret', SALT);

  await unlock('passphrase', otherSalt);
  await assert.rejects(() => decryptSecret(envelope, otherSalt));
});

test('a key derived for one salt is not accepted for another', async () => {
  await unlock('passphrase', SALT);
  await assert.rejects(
    () => encryptSecret('x', generateSalt()),
    (error: VaultError) => error.code === 'locked',
  );
});

test('an unrecognised envelope is reported as corrupt, not as a bad passphrase', async () => {
  await unlock('passphrase', SALT);
  await assert.rejects(
    () => decryptSecret('v9.1.aaaa.bbbb', SALT),
    (error: VaultError) => error.code === 'corrupt',
  );
});

test('an empty passphrase is refused', async () => {
  await assert.rejects(
    () => unlock('', SALT),
    (error: VaultError) => error.code === 'bad-passphrase',
  );
});
