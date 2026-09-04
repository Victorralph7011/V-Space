import * as ExpoCrypto from 'expo-crypto';
import { gcm } from '@noble/ciphers/aes';
import { pbkdf2Async } from '@noble/hashes/pbkdf2';
import { sha256 } from '@noble/hashes/sha2';
import { configureCrypto, type CryptoProvider } from '@vspace/core';

/**
 * Mobile implementation of the vault's crypto primitives — the counterpart to
 * apps/web/src/lib/crypto.ts, which uses `window.crypto.subtle`. React Native
 * has no WebCrypto, and `expo-crypto` covers secure random bytes and hashing
 * but not AES-GCM or PBKDF2 directly.
 *
 * `@noble/ciphers` and `@noble/hashes` (audited, dependency-free, pure
 * TypeScript — no native bindings) fill that gap. That last property is the
 * reason they were chosen over an alternative like `react-native-quick-crypto`:
 * a pure-JS implementation runs unmodified in plain Expo Go, while a native
 * module would force every contributor onto a custom dev client just to test
 * the vault. `@noble/ciphers`' GCM output already appends the 16-byte auth tag
 * to the ciphertext, matching WebCrypto's convention exactly — the same
 * envelope `vault.ts` produces on web decrypts here unchanged, and vice versa.
 */
const expoCryptoProvider: CryptoProvider = {
  randomBytes(length) {
    return ExpoCrypto.getRandomBytes(length);
  },

  pbkdf2(passphrase, salt, iterations, length) {
    return pbkdf2Async(sha256, new TextEncoder().encode(passphrase), salt, {
      c: iterations,
      dkLen: length,
    });
  },

  async encrypt(key, iv, plaintext) {
    return gcm(key, iv).encrypt(plaintext);
  },

  async decrypt(key, iv, ciphertext) {
    return gcm(key, iv).decrypt(ciphertext);
  },
};

export function initCrypto(): void {
  configureCrypto(expoCryptoProvider);
}
