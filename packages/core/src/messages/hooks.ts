import { useEffect, useState } from 'react';
import { limit as fsLimit, onSnapshot, orderBy, query } from 'firebase/firestore';

import { messagesCol } from '../firebase/paths.ts';
import { docToRecord } from '../shared/firestore.ts';
import type { ID, Message } from '../types/index.ts';

/**
 * The chat timeline, newest last.
 *
 * Windowed rather than complete: the chat is a running log that only grows, and
 * nothing in the app searches it — search runs over items. Loading the most
 * recent slice keeps a two-year-old conversation from being downloaded to show
 * you today's messages, with older ones fetched on demand as you scroll.
 */
export function useMessages(uid: ID | null, count = 120): {
  messages: Message[];
  loaded: boolean;
} {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!uid) {
      setMessages([]);
      setLoaded(false);
      return;
    }

    const unsubscribe = onSnapshot(
      query(messagesCol(uid), orderBy('createdAt', 'desc'), fsLimit(count)),
      (snapshot) => {
        // Queried descending so the limit takes the *newest* messages, then
        // reversed for display — a chat reads oldest to newest.
        setMessages(snapshot.docs.map((d) => docToRecord<Message>(d)).reverse());
        setLoaded(true);
      },
      () => setLoaded(true),
    );

    return unsubscribe;
  }, [uid, count]);

  return { messages, loaded };
}
