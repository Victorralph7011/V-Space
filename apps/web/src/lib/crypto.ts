'use client';

import { configureCrypto, type CryptoProvider } from '@vspace/core';

/**
 * Web implementation of the vault's crypto primitives, backed directly by the
 * browser's WebCrypto (`window.crypto.subtle`).
 *
 * This file exists so `packages/core/crypto/vault.ts` never imports a
 * browser global. React Native's equivalent (`apps/mobile/src/lib/crypto.ts`)
 * implements the exact same `CryptoProvider` shape against `expo-crypto`, and
 * the two are guaranteed to interoperate because `vault.ts` defines the
 * envelope format once, in the platform-agnostic layer.
 */
const webCryptoProvider: CryptoProvider = {
  randomBytes(length) {
    return crypto.getRandomValues(new Uint8Array(length));
  },

  async pbkdf2(passphrase, salt, iterations, length) {
    const baseKey = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(passphrase),
      'PBKDF2',
      false,
      ['deriveBits'],
    );
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt: new Uint8Array(salt), iterations, hash: 'SHA-256' },
      baseKey,
      length * 8,
    );
    return new Uint8Array(bits);
  },

  async encrypt(key, iv, plaintext) {
    const cryptoKey = await crypto.subtle.importKey('raw', new Uint8Array(key), 'AES-GCM', false, [
      'encrypt',
    ]);
    const result = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: new Uint8Array(iv) },
      cryptoKey,
      new Uint8Array(plaintext),
    );
    return new Uint8Array(result);
  },

  async decrypt(key, iv, ciphertext) {
    const cryptoKey = await crypto.subtle.importKey('raw', new Uint8Array(key), 'AES-GCM', false, [
      'decrypt',
    ]);
    const result = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(iv) },
      cryptoKey,
      new Uint8Array(ciphertext),
    );
    return new Uint8Array(result);
  },
};

export function initCrypto(): void {
  if (typeof window === 'undefined' || !window.crypto?.subtle) return;
  configureCrypto(webCryptoProvider);
}
