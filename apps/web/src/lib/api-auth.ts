import 'server-only';
import { NextResponse } from 'next/server';
import { adminAuth } from './firebase-admin';

/**
 * Every `/api/*` route needs to answer one question first: which account is
 * this request for? A client sends its Firebase ID token as a Bearer header;
 * this verifies it server-side and returns the uid, or a ready-to-return 401.
 *
 * Centralising this is what guarantees no route accidentally trusts a `uid`
 * the client sent in the request body — the only uid any handler ever acts on
 * is the one this function extracted from a cryptographically verified token.
 */
export async function requireUid(
  request: Request,
): Promise<{ uid: string } | { error: NextResponse }> {
  const header = request.headers.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return { error: NextResponse.json({ error: 'Missing Authorization header.' }, { status: 401 }) };
  }

  try {
    const decoded = await adminAuth().verifyIdToken(token);
    return { uid: decoded.uid };
  } catch {
    return { error: NextResponse.json({ error: 'Invalid or expired token.' }, { status: 401 }) };
  }
}
