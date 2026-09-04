import { initializeApp, getApps } from 'firebase/app';
// Imported from the scoped @firebase/auth package rather than the top-level
// `firebase/auth` convenience re-export: only @firebase/auth's package.json
// declares a "react-native" export condition (resolving to
// dist/rn/index.rn.d.ts), which is what makes `getReactNativePersistence`
// exist in the first place. The top-level `firebase` package's own exports
// map has no react-native condition for its `./auth` subpath — importing
// from `firebase/auth` here would resolve to the browser build and the
// symbol simply wouldn't exist, even though `firebase/auth` works fine for
// everything else in this file.
import { getReactNativePersistence, initializeAuth } from '@firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { configureFirebase, isConfigured } from '@vspace/core';

/**
 * Mobile wiring for the platform-agnostic `configureFirebase()` in
 * @vspace/core — the React Native counterpart to apps/web/src/lib/firebase.ts.
 *
 * Two things genuinely differ from web, both handled here so nothing above
 * this file has to know:
 *
 *   - Auth persistence: the browser SDK's default (IndexedDB) doesn't exist
 *     in React Native, so `getReactNativePersistence(AsyncStorage)` is
 *     required explicitly, or every cold start would sign you out.
 *   - Firestore's streaming transport is unreliable on some Android
 *     networking stacks; `experimentalAutoDetectLongPolling` falls back to
 *     long-polling automatically when it detects that, rather than the app
 *     failing silently on affected devices.
 *
 * This stack deliberately uses the pure JS `firebase` SDK rather than
 * `@react-native-firebase` (a separate native-module package) — the same
 * choice SpaceM made. The trade-off worth knowing: unlike the web app, this
 * does not get `persistentLocalCache`'s full offline-first IndexedDB cache,
 * since that's a browser-only feature of the JS SDK. Reads still work
 * offline via the SDK's in-memory cache for the current session, but a cold
 * start with no connection will not have yesterday's data the way the web
 * app does. Moving to `@react-native-firebase` later would close that gap at
 * the cost of native build complexity — deferred, not forgotten.
 */
export function initFirebase(): void {
  if (isConfigured()) return;

  // EXPO_PUBLIC_* env vars are inlined into the bundle at build time by
  // Expo's own tooling (since SDK 49) — no app.json `extra` block or
  // `expo-constants` needed. Mirrors the web app's NEXT_PUBLIC_* convention.
  const config = {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY!,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN!,
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID!,
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET!,
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID!,
  };

  configureFirebase({
    config,
    initAuth: (app) =>
      initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage),
      }),
    initFirestore: (app) =>
      initializeFirestore(app, {
        experimentalAutoDetectLongPolling: true,
      }),
    initStorage: (app) => getStorage(getApps().length ? app : initializeApp(config)),
  });
}
