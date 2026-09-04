'use client';

import Link from 'next/link';
import Image from 'next/image';
import type { Item } from '@vspace/core';
import { iconForKind, icons } from '@/components/ui/Icon';

/**
 * One row in a section list. The same card renders every kind — a reel, a
 * prompt, a screenshot, an idea — because the only thing that differs between
 * them is which icon and which preview to show, both driven off `item.kind`.
 * A dedicated `PromptCard`/`LinkCard`/`ImageCard` per section would just be
 * this file five times with the branching removed.
 */
export function ItemCard({ item }: { item: Item }) {
  const Icon = iconForKind(item.kind);
  const pending = item.enrichment.state === 'pending';

  return (
    <Link
      href={`/item/${item.id}`}
      className="v-enter flex items-start gap-3 rounded-xl border border-border bg-bg-elevated p-3 transition-colors hover:border-border-strong"
    >
      {item.media?.downloadUrl ? (
        <Image
          src={item.media.thumbUrl ?? item.media.downloadUrl}
          alt=""
          width={56}
          height={56}
          className="size-14 shrink-0 rounded-lg border border-border object-cover"
        />
      ) : (
        <span className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-surface text-text-muted">
          <Icon className="size-5" />
        </span>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate text-subheading text-text">{item.title}</p>
          {item.pinned && <icons.pin className="mt-0.5 size-3.5 shrink-0 text-text-faint" />}
        </div>

        <p className="mt-0.5 line-clamp-2 text-bodySm text-text-muted">
          {item.encrypted
            ? 'Encrypted — unlock to view'
            : pending
              ? 'Ralph is writing a description…'
              : item.description || item.body || 'No description yet'}
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {item.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="rounded-full bg-surface px-2 py-0.5 text-micro text-text-muted">
              #{tag}
            </span>
          ))}
          <span className="ml-auto text-micro text-text-faint">{relativeDate(item.createdAt)}</span>
        </div>
      </div>
    </Link>
  );
}

function relativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}
