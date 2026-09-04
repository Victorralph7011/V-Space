'use client';

import { useEffect, useRef } from 'react';
import { appendCaptureReply, appendMessage, captureAnyText, captureImage } from '@vspace/core';
import { useMessages } from '@vspace/core/hooks';
import { useAuth } from '@/lib/auth-context';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { ChatComposer } from '@/components/chat/ChatComposer';
import { icons } from '@/components/ui/Icon';
import { triggerEnrichment } from '@/lib/enrich-client';

/**
 * The default surface. Everything the plan calls "milestone 2" happens here:
 * type or paste anything, it is classified and filed in well under a second
 * with no network round trip, and only afterwards does enrichment run in the
 * background to fill in the description.
 */
export default function ChatPage() {
  const { user, profile } = useAuth();
  const { messages, loaded } = useMessages(user?.uid ?? null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length]);

  async function handleSend(text: string) {
    if (!user || !profile) return;
    await appendMessage(user.uid, 'user', text);

    // null means: this was a secret and the passphrase prompt was cancelled.
    // Nothing was saved — see capture.ts — so the chat says that plainly
    // rather than showing a "Saved" reply for something that never landed.
    const item = await captureAnyText(user.uid, text, profile);
    if (!item) {
      await appendMessage(user.uid, 'ralph', "Not saved — the vault wasn't unlocked.");
      return;
    }

    await appendCaptureReply(user.uid, item);
    triggerEnrichment(item.id);
  }

  async function handleAttach(file: File) {
    if (!user) return;
    // Captured before the user's own message is appended, and specifically
    // linked to it (unlike a text capture), so the bubble can render the
    // actual photo — like an attachment in a normal chat app — instead of a
    // text line naming the file.
    const item = await captureImage(user.uid, file, file.name);
    await appendMessage(user.uid, 'user', '', item.id);
    await appendCaptureReply(user.uid, item);
    triggerEnrichment(item.id);
  }

  return (
    <div className="flex h-full flex-col">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-4 sm:px-6">
        {loaded && messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-surface text-text-faint">
              <icons.chat className="size-5" />
            </div>
            <p className="text-subheading text-text">This is your space</p>
            <p className="max-w-[36ch] text-bodySm text-text-muted">
              Paste a reel, a prompt, an idea, or &ldquo;submit assignment friday 6pm&rdquo; — it gets filed
              and described automatically.
            </p>
          </div>
        )}

        <div className="mx-auto flex max-w-2xl flex-col gap-3">
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
        </div>
      </div>

      <div className="mx-auto w-full max-w-2xl">
        <ChatComposer onSend={handleSend} onAttach={handleAttach} />
      </div>
    </div>
  );
}
