import 'server-only';
import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';

/**
 * Server-only Firebase Admin wiring, used exclusively by the `/api/*` route
 * handlers.
 *
 * `import 'server-only'` makes it a build error to import this from any
 * client component — the service account key it loads must never reach a
 * browser bundle. This is the one file in the repo trusted with that key.
 *
 * The service account is supplied as one base64-encoded JSON env var rather
 * than three separate `FIREBASE_*` strings, because private keys contain
 * literal newlines that get mangled by Vercel's dashboard and by `.env`
 * parsers in slightly different ways on every platform — base64 sidesteps
 * that class of "works locally, breaks in prod" bug entirely.
 */
let app: App | null = null;

function adminApp(): App {
  if (app) return app;
  if (getApps().length) {
    app = getApps()[0]!;
    return app;
  }

  const encoded = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (!encoded) {
    throw new Error(
      'FIREBASE_SERVICE_ACCOUNT_BASE64 is not set. Generate a service account key from ' +
        'Firebase Console → Project Settings → Service accounts, base64-encode the JSON ' +
        'file, and set it as an env var (see apps/web/.env.example).',
    );
  }

  const serviceAccount = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'));
  app = initializeApp({ credential: cert(serviceAccount) });
  return app;
}

export const adminAuth = () => getAdminAuth(adminApp());
export const adminDb = () => getAdminFirestore(adminApp());
