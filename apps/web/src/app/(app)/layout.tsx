'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { SECTIONS } from '@vspace/core';
import { useDueCount, useSectionCounts } from '@vspace/core/hooks';
import { useAuth } from '@/lib/auth-context';
import { icons, iconForKind } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/Button';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { CommandPalette } from '@/components/search/CommandPalette';
import { VaultModal } from '@/components/vault/VaultModal';

/**
 * The persistent shell: a navigation rail on the left, everything else on the
 * right. Below `md` the rail becomes a bottom tab bar — see the `md:` prefixes
 * throughout, which is the entire mechanism; no separate mobile layout exists.
 *
 * This is also the auth boundary for the whole `(app)` route group: every page
 * inside it renders only once a signed-in user is confirmed, and an
 * unauthenticated visit is redirected to `/auth/login` before anything in the
 * item stream is ever requested.
 */
export default function AppShellLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, loading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const counts = useSectionCounts();
  const dueCount = useDueCount();

  useEffect(() => {
    if (!loading && !user) router.replace('/auth/login');
  }, [loading, user, router]);

  if (loading || !user || !profile) {
    return (
      <div className="flex h-dvh items-center justify-center bg-bg">
        <icons.spinner className="size-5 animate-spin text-text-faint" />
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col-reverse bg-bg md:flex-row">
      <nav className="flex shrink-0 items-center justify-around border-t border-border bg-bg-elevated px-2 py-1.5 md:w-rail md:flex-col md:items-stretch md:justify-start md:border-t-0 md:border-r md:px-3 md:py-5">
        <Link
          href="/"
          className="mb-1 hidden items-center gap-2 px-2.5 pb-4 md:flex"
        >
          <div className="size-6 rounded-md bg-accent" />
          <span className="text-subheading text-text">V-Space</span>
        </Link>

        <NavItem
          href="/"
          label="Chat"
          Icon={icons.chat}
          active={pathname === '/'}
        />

        {SECTIONS.map((section) => (
          <NavItem
            key={section.slug}
            href={`/${section.slug}`}
            label={section.label}
            Icon={iconForKind(section.kinds[0]!)}
            active={pathname.startsWith(`/${section.slug}`)}
            badge={
              section.slug === 'reminders'
                ? dueCount || undefined
                : counts[section.slug] || undefined
            }
          />
        ))}

        <div className="mt-auto hidden items-center justify-between px-2.5 pt-4 md:flex">
          <span className="truncate text-bodySm text-text-muted">
            {profile.displayName}
          </span>
          <div className="flex items-center gap-0.5">
            <ThemeToggle uid={user.uid} current={profile.settings.theme} />
            <IconButton label="Sign out" size="sm" onClick={() => signOut()}>
              <icons.signOut className="size-4" />
            </IconButton>
          </div>
        </div>
      </nav>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center justify-between border-b border-border px-4 py-2.5 md:hidden">
          <div className="flex items-center gap-2">
            <div className="size-5 rounded bg-accent" />
            <span className="text-subheading text-text">V-Space</span>
          </div>
          <div className="flex items-center gap-0.5">
            <ThemeToggle uid={user.uid} current={profile.settings.theme} />
            <IconButton label="Search" onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}>
              <icons.search className="size-4.5" />
            </IconButton>
          </div>
        </header>

        <div className="hidden shrink-0 items-center justify-end border-b border-border px-5 py-2.5 md:flex">
          <button
            onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}
            className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5 text-bodySm text-text-muted hover:border-border-strong"
          >
            <icons.search className="size-3.5" />
            Search
            <kbd className="ml-2 rounded border border-border px-1.5 py-0.5 text-micro">Ctrl K</kbd>
          </button>
        </div>

        <main className="min-h-0 flex-1 overflow-hidden">{children}</main>
      </div>

      <CommandPalette />
      <VaultModal />
    </div>
  );
}

function NavItem({
  href,
  label,
  Icon,
  active,
  badge,
}: {
  href: string;
  label: string;
  Icon: typeof icons.chat;
  active: boolean;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      className={[
        'flex flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 text-micro transition-colors duration-fast',
        'md:mb-0.5 md:flex-row md:justify-start md:gap-2.5 md:px-2.5 md:py-2 md:text-bodySm',
        active ? 'text-text md:bg-surface md:font-semibold' : 'text-text-muted hover:text-text',
      ].join(' ')}
    >
      <span className="relative">
        <Icon className="size-5 md:size-4" />
        {!!badge && (
          <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-overdue px-1 text-[10px] font-bold text-text-inverse md:hidden">
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </span>
      <span className="md:flex-1 md:text-left">{label}</span>
      {!!badge && (
        <span className="hidden rounded-full bg-surface-hi px-1.5 py-0.5 text-micro text-text-muted md:inline-block">
          {badge}
        </span>
      )}
    </Link>
  );
}
