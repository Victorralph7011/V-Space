import { getDoc, setDoc, updateDoc } from 'firebase/firestore';
import type { User as FirebaseUser } from 'firebase/auth';

import { userDoc } from '../firebase/paths.ts';
import { dropUndefined, maybeDocToRecord, nowIso } from '../shared/firestore.ts';
import { DEFAULT_SETTINGS } from '../types/index.ts';
import type { ID, UserSettings, VUser } from '../types/index.ts';

/**
 * The user profile document. Thin by design — Firebase Auth already owns
 * identity (email, password, provider tokens); this only holds the settings
 * V-Space itself needs, so there is exactly one place that can drift from
 * what Auth actually knows.
 */

export async function getUserProfile(uid: ID): Promise<VUser | null> {
  return maybeDocToRecord<VUser>(await getDoc(userDoc(uid)));
}

/**
 * Creates the profile document on first sign-in. Safe to call on every
 * sign-in: an existing profile is left untouched rather than overwritten,
 * which matters because it is the one place `settings.vaultSalt` lives once a
 * secret has been saved — a naive overwrite would silently orphan the vault.
 */
export async function ensureUserProfile(user: FirebaseUser): Promise<VUser> {
  const existing = await getUserProfile(user.uid);
  if (existing) return existing;

  const profile: VUser = {
    id: user.uid,
    displayName: user.displayName ?? user.email?.split('@')[0] ?? 'You',
    email: user.email ?? '',
    photoURL: user.photoURL,
    settings: DEFAULT_SETTINGS,
    createdAt: nowIso(),
  };

  const { id: _id, ...body } = profile;
  await setDoc(userDoc(user.uid), dropUndefined(body));
  return profile;
}

export async function updateSettings(uid: ID, patch: Partial<UserSettings>): Promise<void> {
  const entries = Object.entries(dropUndefined(patch)).map(([key, value]) => [`settings.${key}`, value]);
  await updateDoc(userDoc(uid), Object.fromEntries(entries));
}

/**
 * Records the vault salt the first time a secret is saved. Uses a targeted
 * field update rather than `updateSettings` so a concurrent settings change
 * from another tab can never race and drop this one — each call touches only
 * the one field it owns.
 */
/**
 * Records the salt and the verification canary together, the one time the
 * vault is set up. Writing them as a single update means there is never a
 * moment where a salt exists without its matching check value (or vice
 * versa) for another tab or device to read mid-setup.
 */
export const setVaultSetup = (uid: ID, salt: string, check: string): Promise<void> =>
  updateDoc(userDoc(uid), { 'settings.vaultSalt': salt, 'settings.vaultCheck': check });
