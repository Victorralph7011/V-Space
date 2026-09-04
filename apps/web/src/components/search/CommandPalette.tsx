'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSearch } from '@vspace/core/hooks';
import { icons, iconForKind } from '@/components/ui/Icon';

/**
 * Global search, opened with Ctrl/Cmd+K from anywhere in the app.
 *
 * This is the desktop payoff the plan calls out explicitly: search across
 * every section at once, with a keyboard shortcut, is the thing a phone
 * screen cannot really offer but a Windows machine can. It runs entirely
 * against `useSearch`, which never touches the network — every keystroke here
 * costs nothing and returns instantly regardless of connection.
 */
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const { hits } = useSearch(query, { limit: 20 });

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const isShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k';
      if (isShortcut) {
        event.preventDefault();
        setOpen((prev) => !prev);
      } else if (event.key === 'Escape' && open) {
        setOpen(false);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  useEffect(() => {
    if (open) {
      // Resetting on open (not on every render) and focusing the just-mounted
      // input are exactly what an effect is for — this isn't state that could
      // be computed during render, since "open" transitioning is the trigger.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setQuery('');
      setActiveIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- keyboard selection resets whenever the result set changes; there's no render-time value to compute this from.
  useEffect(() => setActiveIndex(0), [query]);

  function openHit(index: number) {
    const hit = hits[index];
    if (!hit) return;
    setOpen(false);
    router.push(`/item/${hit.item.id}`);
  }

  function onKeyDownInInput(event: React.KeyboardEvent) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, hits.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      openHit(activeIndex);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-modal flex items-start justify-center bg-overlay pt-[14vh]"
      onClick={() => setOpen(false)}
    >
      <div
        role="dialog"
        aria-label="Search V-Space"
        className="v-enter flex max-h-[65vh] w-full max-w-xl flex-col overflow-hidden rounded-xl border border-border bg-bg-elevated shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-border px-4 py-3.5">
          <icons.search className="size-4.5 shrink-0 text-text-faint" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDownInInput}
            placeholder="Search everything you've saved…"
            className="min-w-0 flex-1 bg-transparent text-body text-text placeholder:text-text-faint focus:outline-none"
          />
          <kbd className="rounded border border-border px-1.5 py-0.5 text-micro text-text-faint">esc</kbd>
        </div>

        <div className="overflow-y-auto py-1.5">
          {hits.length === 0 && query.trim() && (
            <p className="px-4 py-6 text-center text-bodySm text-text-muted">Nothing found for &ldquo;{query}&rdquo;.</p>
          )}
          {hits.map((hit, index) => {
            const Icon = iconForKind(hit.item.kind);
            return (
              <button
                key={hit.item.id}
                onClick={() => openHit(index)}
                onMouseEnter={() => setActiveIndex(index)}
                className={[
                  'flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors',
                  index === activeIndex ? 'bg-surface' : '',
                ].join(' ')}
              >
                <Icon className="size-4 shrink-0 text-text-muted" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-bodySm font-medium text-text">{hit.item.title}</p>
                  {hit.item.description && (
                    <p className="truncate text-micro text-text-muted">{hit.item.description}</p>
                  )}
                </div>
                {hit.item.encrypted && <icons.lock className="size-3.5 shrink-0 text-text-faint" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
