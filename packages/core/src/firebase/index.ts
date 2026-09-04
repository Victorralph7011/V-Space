import type { FirebaseApp, FirebaseOptions } from 'firebase/app';
import { getApps, initializeApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import type { FirebaseStorage } from 'firebase/storage';

/**
 * Firebase setup is *injected*, not performed here.
 *
 * The two platforms genuinely differ in ways that cannot be papered over:
 * web persists auth in IndexedDB and Firestore in a multi-tab IndexedDB cache,
 * while React Native persists auth through AsyncStorage and has no IndexedDB at
 * all. Importing either platform's modules into this package would break the
 * other's bundler.
 *
 * So each app supplies the two initializers, and everything below this line —
 * every service, hook and query in `packages/core` — is platform-agnostic.
 */
export interface FirebaseSetup {
  config: FirebaseOptions;
  initAuth: (app: FirebaseApp) => Auth;
  initFirestore: (app: FirebaseApp) => Firestore;
  initStorage: (app: FirebaseApp) => FirebaseStorage;
}

interface Wiring {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  storage: FirebaseStorage;
}

let wiring: Wiring | null = null;

/**
 * Call once, before anything else, from the app's root. Idempotent: React
 * Fast Refresh and Next's double-render in development both re-run module
 * bodies, and re-initializing Firebase throws.
 */
export function configureFirebase(setup: FirebaseSetup): void {
  if (wiring) return;

  const app = getApps().length ? getApps()[0]! : initializeApp(setup.config);

  wiring = {
    app,
    auth: setup.initAuth(app),
    db: setup.initFirestore(app),
    storage: setup.initStorage(app),
  };
}

function required(): Wiring {
  if (!wiring) {
    throw new Error(
      'Firebase is not configured. Call configureFirebase() from the app root ' +
        'before rendering — see apps/web/src/lib/firebase.ts.',
    );
  }
  return wiring;
}

export const getApp = (): FirebaseApp => required().app;
export const getAuth = (): Auth => required().auth;
export const getDb = (): Firestore => required().db;
export const getStorage = (): FirebaseStorage => required().storage;

/** True once configureFirebase has run — lets UI render a setup screen instead of throwing. */
export const isConfigured = (): boolean => wiring !== null;

/** Test-only. Never call from application code. */
export function __resetFirebaseForTests(): void {
  wiring = null;
}
