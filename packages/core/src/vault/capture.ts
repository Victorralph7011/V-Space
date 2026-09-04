import { captureText, createItem } from '../items/services.ts';
import { classify } from '../classify/local.ts';
import { encryptSecret } from '../crypto/vault.ts';
import { ensureVaultUnlocked } from './ensure-unlocked.ts';
import type { ID, Item, VUser } from '../types/index.ts';

/**
 * The vault-aware front door to capture, shared by web and mobile.
 *
 * `captureText` stores whatever it is given as plaintext — correctly, since
 * it has no concept of a passphrase prompt. This is the layer above it that
 * intercepts the one case that must never reach Firestore unencrypted: a
 * `kind: 'secret'` classification.
 *
 * Returns `null` if the item was a secret and the user cancelled the
 * passphrase prompt. Nothing is saved in that case — there is no "save it
 * anyway, unencrypted" fallback, because that would defeat the entire feature
 * the moment someone is in a hurry.
 */
export async function captureAnyText(uid: ID, text: string, profile: VUser): Promise<Item | null> {
  const classification = classify(text);
  if (classification.kind !== 'secret') return captureText(uid, text);

  const salt = await ensureVaultUnlocked(uid, profile.settings.vaultSalt, profile.settings.vaultCheck);
  if (!salt) return null;

  const envelope = await encryptSecret(text, salt);
  return createItem(uid, {
    kind: 'secret',
    title: classification.title,
    body: envelope,
    tags: classification.tags,
    source: classification.source,
    encrypted: true,
  });
}
