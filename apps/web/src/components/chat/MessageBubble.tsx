'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { ItemKind, Message } from '@vspace/core';
import { useItem } from '@vspace/core/hooks';
import { iconForKind, icons } from '@/components/ui/Icon';

/**
 * One line in the chat. A `role: 'user'` message is what you typed; a
 * `role: 'ralph'` message is the app's reply, and it links straight to the
 * item it produced — tapping "Saved to Links Space" opens that exact reel.
 *
 * The item card renders live off `useItem`, so if enrichment finishes while
 * you are still looking at the chat, the description fades in without a
 * reload — the same listener that feeds the section pages feeds this bubble.
 */
export function MessageBubble({ message }: { message: Message }) {
  const item = useItem(message.itemId);
  const isUser = message.role === 'user';

  // An attached photo is linked to the user's own message (see the chat
  // page's handleAttach) specifically so it can render as an actual image
  // here — like any normal chat app's photo attachment — rather than a text
  // bubble naming the file.
  const isPendingPhoto = isUser && item?.kind === 'image' && !item.media?.downloadUrl;
  const isPhotoAttachment = isUser && item?.kind === 'image' && !!item.media?.downloadUrl;

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex max-w-[85%] flex-col gap-1.5 sm:max-w-[70%] ${isUser ? 'items-end' : 'items-start'}`}>
        {isPhotoAttachment ? (
          <Link href={`/item/${item.id}`} className="block overflow-hidden rounded-2xl rounded-br-md">
            <Image
              src={item.media!.downloadUrl}
              alt=""
              width={280}
              height={280}
              className="h-auto max-h-80 w-full max-w-[280px] object-cover"
            />
          </Link>
        ) : isPendingPhoto ? (
          // No `media` yet: either the upload is still in flight, or it
          // failed (see captureImage's try/catch) — either way there is no
          // photo to show, so this replaces what would otherwise be a blank
          // bubble with an honest status line instead of empty space.
          <div className="flex items-center gap-2 rounded-2xl rounded-br-md bg-accent px-3.5 py-2.5 text-body text-text-inverse">
            {item.enrichment.state === 'failed' ? (
              <>
                <icons.alert className="size-4 shrink-0" />
                Photo failed to upload
              </>
            ) : (
              <>
                <icons.spinner className="size-4 shrink-0 animate-spin" />
                Uploading photo…
              </>
            )}
          </div>
        ) : (
          message.text && (
            <div
              className={[
                'whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 text-body',
                isUser
                  ? 'rounded-br-md bg-accent text-text-inverse'
                  : 'rounded-bl-md bg-surface text-text',
              ].join(' ')}
            >
              {message.text}
            </div>
          )
        )}

        {!isUser && item && (
          <Link
            href={`/item/${item.id}`}
            className="flex w-full items-center gap-2.5 rounded-xl border border-border bg-bg-elevated px-3 py-2.5 transition-colors hover:border-border-strong"
          >
            <ItemGlyph
              kind={item.kind}
              pending={item.enrichment.state === 'pending'}
              thumbUrl={item.media?.thumbUrl ?? item.media?.downloadUrl}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-bodySm font-semibold text-text">{item.title}</p>
              <p className="truncate text-micro text-text-muted">
                {item.enrichment.state === 'pending'
                  ? 'Ralph is writing a description…'
                  : item.description || item.url || 'Tap to open'}
              </p>
            </div>
          </Link>
        )}
      </div>
    </div>
  );
}

function ItemGlyph({
  kind,
  pending,
  thumbUrl,
}: {
  kind: ItemKind;
  pending: boolean;
  thumbUrl?: string;
}) {
  if (!pending && thumbUrl) {
    return (
      <Image
        src={thumbUrl}
        alt=""
        width={32}
        height={32}
        className="size-8 shrink-0 rounded-lg object-cover"
      />
    );
  }

  const Icon = pending ? icons.spinner : iconForKind(kind);
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface text-text-muted">
      <Icon className={`size-4 ${pending ? 'animate-spin' : ''}`} />
    </span>
  );
}
