import { collection, doc } from 'firebase/firestore';
import type { CollectionReference, DocumentReference } from 'firebase/firestore';
import { getDb } from './index.ts';
import type { ID } from '../types/index.ts';

/**
 * Every Firestore path in the app, in one file.
 *
 * All user data is nested under `users/{uid}`, which is what makes the security
 * rules a single `request.auth.uid == uid` check with nothing to spoof. The
 * cost of that design is that every call site needs the uid — centralising the
 * path builders here means no call site ever assembles a string itself, and a
 * typo becomes a compile error rather than a silent read of an empty
 * collection.
 */
export const userDoc = (uid: ID): DocumentReference => doc(getDb(), 'users', uid);

export const itemsCol = (uid: ID): CollectionReference =>
  collection(getDb(), 'users', uid, 'items');

export const itemDoc = (uid: ID, itemId: ID): DocumentReference =>
  doc(getDb(), 'users', uid, 'items', itemId);

export const messagesCol = (uid: ID): CollectionReference =>
  collection(getDb(), 'users', uid, 'messages');

export const messageDoc = (uid: ID, messageId: ID): DocumentReference =>
  doc(getDb(), 'users', uid, 'messages', messageId);

/** Storage object path for an uploaded image. Mirrors the Firestore nesting. */
export const mediaPath = (uid: ID, itemId: ID, ext: string): string =>
  `users/${uid}/items/${itemId}.${ext}`;
