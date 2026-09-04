import { generateSalt, isUnlocked, unlock, encryptSecret, decryptSecret, VaultError } from '../crypto/vault.ts';
import { setVaultSetup } from '../user/services.ts';
import { requestPassphrase } from './prompt-bridge.ts';
import type { ID } from '../types/index.ts';

/**
 * A fixed plaintext, encrypted under the vault key and stored as
 * `settings.vaultCheck`, purely to verify a passphrase is correct. Real
 * secrets are never at risk from this constant being public — GCM's security
 * does not depend on the plaintext being unknown, only the key.
 */
const CANARY = 'vspace-vault-check-v1';

const MAX_ATTEMPTS = 5;

/**
 * Ensures the vault is unlocked, prompting the user only if it is not
 * already. Called from every path that touches a secret — capturing one, or
 * opening one to view it. Shared by web and mobile: the only thing that
 * differs between platforms is which component renders the prompt this
 * function awaits via `requestPassphrase()`.
 *
 * Two different prompts hide behind one function: an account with no salt yet
 * has never saved a secret, so the prompt reads as "create a vault
 * passphrase" with the no-recovery trade-off spelled out; every time after
 * that it reads as "enter your passphrase". Which one to show is a fact about
 * the data, not something the caller should decide.
 *
 * A wrong passphrase against an *existing* vault is caught here, against the
 * canary, before the caller ever encrypts or decrypts real data — this is
 * what stops a typo from silently re-keying new secrets under the wrong
 * passphrase while old ones become unreadable.
 *
 * Returns the salt to encrypt/decrypt with, or null if the user cancelled.
 */
export async function ensureVaultUnlocked(
  uid: ID,
  existingSalt: string | null,
  existingCheck: string | null,
): Promise<string | null> {
  if (isUnlocked() && existingSalt) return existingSalt;

  if (!existingSalt) {
    const passphrase = await requestPassphrase('create');
    if (!passphrase) return null;

    const salt = generateSalt();
    await unlock(passphrase, salt);
    const check = await encryptSecret(CANARY, salt);
    await setVaultSetup(uid, salt, check);
    return salt;
  }

  let error: string | undefined;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const passphrase = await requestPassphrase('unlock', error);
    if (!passphrase) return null;

    await unlock(passphrase, existingSalt);

    // Older vaults created before this check existed have no canary to test
    // against — nothing to verify, so trust the derived key.
    if (!existingCheck) return existingSalt;

    try {
      await decryptSecret(existingCheck, existingSalt);
      return existingSalt;
    } catch (err) {
      if (err instanceof VaultError && err.code === 'bad-passphrase') {
        error = 'Wrong passphrase. Try again.';
        continue;
      }
      throw err;
    }
  }

  return null;
}
