'use client';

import Link from 'next/link';

/**
 * The mirror of the hero: a short close, then the full wordmark set so large
 * the page edge crops it — the same move the reference spec asks for, using
 * `overflow-hidden` on the section and a wordmark translated down and past
 * its own width.
 */
export function CloseSection() {
  return (
    <section className="relative overflow-hidden border-t border-[var(--mkt-hairline)] pt-24">
      <div className="flex flex-col items-start justify-between gap-8 px-6 pb-20 sm:flex-row sm:items-end md:px-10">
        <div>
          <h2 className="mkt-display max-w-[16ch] text-[clamp(28px,4vw,52px)] leading-[1.05] text-[var(--mkt-ink)]">
            Your own space, from your first paste.
          </h2>
          <p className="mkt-label mt-4 text-[10.5px] text-[var(--mkt-muted)]">Free to start · no card required</p>
        </div>
        <div className="flex shrink-0 gap-3">
          <Link
            href="/auth/signup"
            className="mkt-label rounded-full bg-[var(--mkt-ink)] px-6 py-3 text-[11px] text-[var(--mkt-bg)] transition-opacity hover:opacity-85"
          >
            Create your space
          </Link>
          <Link
            href="/auth/login"
            className="mkt-label rounded-full border border-[var(--mkt-hairline)] px-6 py-3 text-[11px] text-[var(--mkt-ink)] transition-colors hover:border-[var(--mkt-ink-2)]"
          >
            Sign in
          </Link>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-[var(--mkt-hairline)] px-6 py-5 md:px-10">
        <span className="mkt-label text-[10px] text-[var(--mkt-muted)]">V-Space — paste anything, find it again</span>
        <span className="mkt-label text-[10px] text-[var(--mkt-muted)]">Web · Mobile</span>
      </div>

      <p
        aria-hidden
        className="mkt-display translate-y-[28%] select-none whitespace-nowrap px-6 text-[20vw] leading-none text-[var(--mkt-ink)] opacity-[0.06] md:px-10"
      >
        V-Space
      </p>
    </section>
  );
}
