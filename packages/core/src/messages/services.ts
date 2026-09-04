import { deleteDoc, doc, setDoc } from 'firebase/firestore';

import { messageDoc, messagesCol } from '../firebase/paths.ts';
import { dropUndefined, nowIso } from '../shared/firestore.ts';
import { sectionForKind } from '../types/sections.ts';
import type { ID, Item, Message, MessageRole } from '../types/index.ts';

/**
 * The chat timeline.
 *
 * A message records *the act of capturing*; the Item is the thing captured.
 * Keeping the two separate is what lets you clear a stray line out of the chat
 * without losing the reel it saved, and lets Ralph reply in the conversation
 * without having to invent an item to attach the reply to.
 */

export async function appendMessage(
  uid: ID,
  role: MessageRole,
  text: string,
  itemId: ID | null = null,
): Promise<Message> {
  const reference = doc(messagesCol(uid));
  const message: Message = {
    id: reference.id,
    role,
    text,
    itemId,
    createdAt: nowIso(),
  };

  const { id: _id, ...body } = message;
  void setDoc(reference, dropUndefined(body));

  return message;
}

/**
 * Ralph's acknowledgement of a capture.
 *
 * Written immediately from the *local* classification, not after enrichment.
 * The reply is the app telling you where your thing went, and that answer is
 * already known before any network call — waiting for the model would turn a
 * conversation into a loading spinner.
 */
export async function appendCaptureReply(uid: ID, item: Item): Promise<Message> {
  return appendMessage(uid, 'ralph', captureReplyText(item), item.id);
}

export function captureReplyText(item: Item): string {
  const section = sectionForKind(item.kind);

  if (item.kind === 'secret') {
    return 'Encrypted and saved. Only this device can read it.';
  }

  const where = section ? `Saved to ${section.singular}` : 'Saved';

  if (item.dueAt) {
    return `${where} — due ${formatDue(item.dueAt)}.`;
  }

  return `${where}.`;
}

export const deleteMessage = (uid: ID, messageId: ID): Promise<void> =>
  deleteDoc(messageDoc(uid, messageId));

/**
 * Human-readable due date for chat replies and cards. Relative for the next
 * week, absolute after that — "friday" is clearer than a date when it is three
 * days away, and useless when it is three months away.
 */
export function formatDue(iso: string, now: Date = new Date()): string {
  const due = new Date(iso);
  const time = due
    .toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
    .toLowerCase()
    .replace(' ', '');

  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const days = Math.floor((due.getTime() - startOfToday.getTime()) / 86_400_000);

  if (days < 0) return `${due.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`;
  if (days === 0) return `today ${time}`;
  if (days === 1) return `tomorrow ${time}`;
  if (days < 7) return `${due.toLocaleDateString(undefined, { weekday: 'long' })} ${time}`;

  return `${due.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} ${time}`;
}
