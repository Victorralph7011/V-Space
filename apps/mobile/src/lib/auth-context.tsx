import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithCredential,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  type User as FirebaseUser,
} from 'firebase/auth';
import { ensureUserProfile, getAuth, itemStore, resyncReminders, type VUser } from '@vspace/core';

import { initFirebase } from './firebase';
import { initCrypto } from './crypto';
import { initNotifications } from './notifications';

/**
 * The mobile counterpart to apps/web/src/lib/auth-context.tsx — same shape,
 * same responsibilities (wire the platform layer once, track auth state, own
 * the item-stream listener's lifecycle), adapted for two real differences:
 *
 *   - Google sign-in on native can't use a popup (there is no browser chrome
 *     to pop one in). `signInGoogle` takes an ID token obtained by the
 *     screen via `expo-auth-session`'s Google provider and exchanges it with
 *     `signInWithCredential` — the OAuth dance itself lives in the login
 *     screen, not here, since it needs screen-level redirect handling.
 *   - There is no router to redirect from up here; `RootNavigator` reads
 *     `user` from this context and switches stacks itself.
 */
interface AuthState {
  user: FirebaseUser | null;
  profile: VUser | null;
  loading: boolean;
  signInEmail: (email: string, password: string) => Promise<void>;
  signUpEmail: (email: string, password: string, displayName: string) => Promise<void>;
  signInGoogle: (idToken: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<VUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // One-time platform wiring — see each init function for why this can't
    // happen during render (real side effects: keychain/AsyncStorage access,
    // an Android notification channel).
    initFirebase();
    initCrypto();
    void initNotifications();
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
      async signInGoogle(idToken) {
        await signInWithCredential(getAuth(), GoogleAuthProvider.credential(idToken));
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
