/**
 * Public surface of @vspace/core.
 *
 * Both apps import from here, never from a deeper path — that indirection is
 * what lets an internal file move without a cross-package find-and-replace.
 */

export * from './types/index.ts';
export * from './types/sections.ts';

export {
  configureFirebase,
  isConfigured,
  getApp,
  getAuth,
  getDb,
  getStorage,
} from './firebase/index.ts';
export type { FirebaseSetup } from './firebase/index.ts';

export * from './shared/firestore.ts';

export * from './classify/local.ts';

export { SearchIndex, isEditDistanceOne, isAdjacentTransposition, isNearMatch } from './search/index.ts';
export type { SearchHit, SearchOptions } from './search/index.ts';
export { tokenizeText, tokenizeUrl, tokensForItem, storedTokens } from './search/tokenize.ts';

export * from './items/services.ts';
export * from './items/enrichment-policy.ts';
export { itemStore } from './items/store.ts';
export type { ItemsState } from './items/store.ts';
// React hooks (items/hooks.ts, messages/hooks.ts) are deliberately NOT
// re-exported here — see hooks.ts for why. Import them from '@vspace/core/hooks'.

export * from './messages/services.ts';

export * from './user/services.ts';

export {
  configureCrypto,
  isCryptoAvailable,
  generateSalt,
  isUnlocked,
  unlock,
  lock,
  encryptSecret,
  decryptSecret,
  isEnvelope,
  VaultError,
} from './crypto/vault.ts';
export type { CryptoProvider, VaultErrorCode } from './crypto/vault.ts';

export * from './vault/prompt-bridge.ts';
export * from './vault/ensure-unlocked.ts';
export * from './vault/capture.ts';

export * from './reminders/schedule.ts';

export * from './auth/errors.ts';
