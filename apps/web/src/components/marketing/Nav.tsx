'use client';

import Link from 'next/link';

/**
 * Fixed 58px bar, translucent with a blur so the hero visual reads through it
 * as the page scrolls underneath. The wordmark's trailing period carries the
 * amber accent — the one piece of the mark that's allowed a color, echoed by
 * the full wordmark at the very end of the page.
 */
export function Nav() {
  return (
    <nav className="fixed inset-x-0 top-0 z-50 flex h-[58px] items-center justify-between border-b border-[var(--mkt-hairline)] bg-[var(--mkt-bg)]/70 px-6 backdrop-blur-md md:px-10">
      <Link href="/" className="mkt-display text-[15px] text-[var(--mkt-ink)]">
        V-Space<span className="text-[var(--mkt-amber)]">.</span>
      </Link>

      <div className="hidden items-center gap-8 md:flex">
        <a
          href="#capture"
          className="mkt-label text-[10.5px] text-[var(--mkt-ink-2)] transition-colors hover:text-[var(--mkt-amber)]"
        >
          What it does
        </a>
        <a
          href="#sections"
          className="mkt-label text-[10.5px] text-[var(--mkt-ink-2)] transition-colors hover:text-[var(--mkt-amber)]"
        >
          Sections
        </a>
        <a
          href="#how"
          className="mkt-label text-[10.5px] text-[var(--mkt-ink-2)] transition-colors hover:text-[var(--mkt-amber)]"
        >
          How it works
        </a>
      </div>

      <Link
        href="/auth/login"
        className="mkt-label rounded-full bg-[var(--mkt-ink)] px-4 py-2 text-[10.5px] text-[var(--mkt-bg)] transition-opacity hover:opacity-85"
      >
        Sign in
      </Link>
    </nav>
  );
}
