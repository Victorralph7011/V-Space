'use client';

import { initializeApp, getApps } from 'firebase/app';
import {
  browserLocalPersistence,
  browserPopupRedirectResolver,
  indexedDBLocalPersistence,
  initializeAuth,
} from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { configureFirebase, isConfigured } from '@vspace/core';

/**
 * Web wiring for the platform-agnostic `configureFirebase()` in @vspace/core.
 *
 * Two choices here matter more than they look:
 *
 *   - `persistentLocalCache` + `persistentMultipleTabManager` is what makes
 *     the item stream (and therefore search) work offline and stay correct
 *     across multiple open tabs, instead of each tab holding a stale copy.
 *   - `indexedDBLocalPersistence` keeps you signed in across a reload, which
 *     a self-storage app has to get right — nobody wants to re-authenticate
 *     to read a link they saved five minutes ago.
 */
export function initFirebase(): void {
  if (isConfigured()) return;

  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
  };

  configureFirebase({
    config,
    initAuth: (app) =>
      initializeAuth(app, {
        persistence: [indexedDBLocalPersistence, browserLocalPersistence],
        // The modular SDK tree-shakes out popup/redirect support by default —
        // every OAuth provider (Google included) needs this resolver wired
        // in explicitly, or signInWithPopup/signInWithRedirect throw
        // `auth/argument-error` immediately, before ever reaching Google.
        popupRedirectResolver: browserPopupRedirectResolver,
      }),
    initFirestore: (app) =>
      initializeFirestore(app, {
        localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
      }),
    initStorage: (app) => getStorage(getApps().length ? app : initializeApp(config)),
  });
}
