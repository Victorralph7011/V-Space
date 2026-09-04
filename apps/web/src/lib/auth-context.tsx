'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  type User as FirebaseUser,
} from 'firebase/auth';
import {
  ensureUserProfile,
  getAuth,
  itemStore,
  resyncReminders,
  type VUser,
} from '@vspace/core';

import { initFirebase } from './firebase';
import { initCrypto } from './crypto';
import { initNotifications } from './notifications';
import { applyTheme } from './theme';

/**
 * Wires the whole platform layer once at the root, then tracks auth state.
 *
 * This is the one place in the web app that calls `configureFirebase`,
 * `configureCrypto`, and `configureNotifications` — every screen below it can
 * assume those are already set up, which is what keeps @vspace/core free of
 * any "is this configured yet?" checks scattered through the UI.
 *
 * It also owns the single item-stream listener's lifecycle: `itemStore.start`
 * on sign-in, `itemStore.stop` on sign-out, so a signed-out session can never
 * hold a stale subscription to another account's data.
 */
interface AuthState {
  user: FirebaseUser | null;
  profile: VUser | null;
  loading: boolean;
  signInEmail: (email: string, password: string) => Promise<void>;
  signUpEmail: (email: string, password: string, displayName: string) => Promise<void>;
  signInGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<VUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // One-time browser-only platform wiring (see each init function — all are
    // internally guarded to no-op outside the browser and to run once). This
    // genuinely cannot happen during render: it has real side effects
    // (touching `window.crypto`, `Notification`, IndexedDB) that must not run
    // during SSR or be repeated on every render pass.
    initFirebase();
    initCrypto();
    initNotifications();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;

    const unsubscribe = onAuthStateChanged(getAuth(), async (firebaseUser) => {
      setUser(firebaseUser);

      if (!firebaseUser) {
        itemStore.stop();
        setProfile(null);
        setLoading(false);
        return;
      }

      const userProfile = await ensureUserProfile(firebaseUser);
      setProfile(userProfile);
      itemStore.start(firebaseUser.uid);
      setLoading(false);
    });

    return unsubscribe;
  }, [ready]);

  // Applies the chosen theme the moment the profile is known, and again on
  // every change — e.g. right after the toggle in the app shell writes a new
  // preference. `applyTheme` itself is what turns 'system' into "OS decides"
  // and 'light'/'dark' into an explicit override; see theme.ts.
  const themePreference = profile?.settings.theme;
  useEffect(() => {
    if (themePreference) applyTheme(themePreference);
  }, [themePreference]);

  // Reminders are reconciled against the OS once the item stream has loaded
  // and settings are known — see notifications.ts for why this is a resync
  // rather than a one-shot schedule.
  useEffect(() => {
    if (!profile) return;
    const unsubscribe = itemStore.subscribe(() => {
      const state = itemStore.getSnapshot();
      if (state.loaded) void resyncReminders(state.items, profile.settings.reminderLeadMinutes);
    });
    return unsubscribe;
  }, [profile]);

  const value = useMemo<AuthState>(
    () => ({
      user,
      profile,
      loading,
      async signInEmail(email, password) {
        await signInWithEmailAndPassword(getAuth(), email, password);
      },
      async signUpEmail(email, password, displayName) {
        const credential = await createUserWithEmailAndPassword(getAuth(), email, password);
        if (displayName.trim()) {
          await updateProfile(credential.user, { displayName: displayName.trim() });
        }
      },
      async signInGoogle() {
        await signInWithPopup(getAuth(), new GoogleAuthProvider());
      },
      async signOut() {
        await firebaseSignOut(getAuth());
      },
    }),
    [user, profile, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>.');
  return context;
}
