'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  decryptSecret,
  deleteItem,
  ensureVaultUnlocked,
  formatDue,
  setPinned,
  setStatus,
  updateItem,
  type Item,
} from '@vspace/core';
import { useItem } from '@vspace/core/hooks';
import { useAuth } from '@/lib/auth-context';
import { icons, iconForKind } from '@/components/ui/Icon';
import { Button, IconButton } from '@/components/ui/Button';
import { triggerEnrichment } from '@/lib/enrich-client';

export default function ItemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, profile } = useAuth();
  const router = useRouter();
  const item = useItem(id);

  const [revealed, setRevealed] = useState<string | null>(null);
  const [revealing, setRevealing] = useState(false);
  const [revealError, setRevealError] = useState<string | null>(null);

  // A freshly-decrypted secret should not stay in memory once you navigate
  // away from the item that owns it — resetting only when `id` itself
  // changes, not on every render, is exactly what this effect is for.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRevealed(null);
    setRevealError(null);
  }, [id]);

  if (!item) {
    return (
      <div className="flex h-full items-center justify-center">
        <icons.spinner className="size-5 animate-spin text-text-faint" />
      </div>
    );
  }

  const Icon = iconForKind(item.kind);

  async function reveal() {
    if (!user || !profile || !item) return;
    setRevealing(true);
    setRevealError(null);
    try {
      const salt = await ensureVaultUnlocked(user.uid, profile.settings.vaultSalt, profile.settings.vaultCheck);
      if (!salt) return;
      setRevealed(await decryptSecret(item.body, salt));
    } catch {
      setRevealError('Could not decrypt this secret on this device.');
    } finally {
      setRevealing(false);
    }
  }

  async function handleDelete() {
    if (!user || !item) return;
    if (!window.confirm(`Delete "${item.title}"? This cannot be undone.`)) return;
    await deleteItem(user.uid, item.id);
    router.back();
  }

  return (
    <div className="h-full overflow-y-auto">
      <header className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-6">
        <IconButton label="Back" onClick={() => router.back()}>
          <icons.back className="size-5" />
        </IconButton>
        <div className="flex items-center gap-1">
          <IconButton
            label={item.pinned ? 'Unpin' : 'Pin'}
            onClick={() => user && setPinned(user.uid, item.id, !item.pinned)}
            className={item.pinned ? 'text-text' : ''}
          >
            <icons.pin className="size-4.5" fill={item.pinned ? 'currentColor' : 'none'} />
          </IconButton>
          <IconButton
            label="Archive"
            onClick={() => user && setStatus(user.uid, item.id, 'archived')}
          >
            <icons.archive className="size-4.5" />
          </IconButton>
          <IconButton label="Delete" onClick={handleDelete}>
            <icons.trash className="size-4.5" />
          </IconButton>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-xl bg-surface text-text-muted">
            <Icon className="size-5" />
          </span>
          <div>
            <p className="text-micro uppercase tracking-wide text-text-faint">{item.kind}</p>
            <p className="text-micro text-text-faint">{new Date(item.createdAt).toLocaleString()}</p>
          </div>
        </div>

        <EditableTitle item={item} uid={user?.uid} />

        {item.dueAt && (
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1 text-bodySm text-text">
            <icons.reminder className="size-3.5" />
            {formatDue(item.dueAt)}
          </div>
        )}

        {item.url && (
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex items-center gap-2 rounded-lg border border-border bg-bg-elevated px-3.5 py-2.5 text-bodySm text-text hover:border-border-strong"
          >
            <icons.external className="size-4 shrink-0 text-text-muted" />
            <span className="truncate">{item.url}</span>
          </a>
        )}

        {item.media?.downloadUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- arbitrary aspect ratios from user uploads
          <img
            src={item.media.downloadUrl}
            alt={item.title}
            className="mt-4 w-full rounded-xl border border-border object-contain"
          />
        )}

        <section className="mt-5">
          <p className="mb-1.5 text-eyebrow text-text-faint">DESCRIPTION</p>
          {item.enrichment.state === 'pending' ? (
            <p className="flex items-center gap-2 text-bodySm text-text-muted">
              <icons.spinner className="size-3.5 animate-spin" />
              Ralph is writing a description…
            </p>
          ) : item.enrichment.state === 'failed' ? (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-3 py-2">
              <p className="flex items-center gap-2 text-bodySm text-text-muted">
                <icons.alert className="size-3.5 text-overdue" />
                Enrichment failed
              </p>
              <Button size="sm" variant="outline" onClick={() => triggerEnrichment(item.id)}>
                Retry
              </Button>
            </div>
          ) : (
            <EditableDescription item={item} uid={user?.uid} />
          )}
        </section>

        {item.encrypted ? (
          <SecretBody
            item={item}
            revealed={revealed}
            revealing={revealing}
            error={revealError}
            onReveal={reveal}
            onHide={() => setRevealed(null)}
          />
        ) : (
          item.body && (
            <section className="mt-5">
              <p className="mb-1.5 text-eyebrow text-text-faint">CONTENT</p>
              <pre className="whitespace-pre-wrap break-words rounded-lg bg-surface p-3.5 font-mono text-code text-text">
                {item.body}
              </pre>
            </section>
          )
        )}

        {item.tags.length > 0 && (
          <section className="mt-5 flex flex-wrap gap-1.5">
            {item.tags.map((tag) => (
              <span key={tag} className="rounded-full bg-surface px-2.5 py-1 text-bodySm text-text-muted">
                #{tag}
              </span>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}

function EditableTitle({ item, uid }: { item: Item; uid: string | undefined }) {
  const [value, setValue] = useState(item.title);
  // Syncs the editable field to the live document whenever it changes out
  // from under the input (e.g. Ralph replacing a placeholder title) — there
  // is no render-time value to derive this from, since it must not fire on
  // every keystroke while the field is actively being edited, only when
  // `item.title` itself changes.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setValue(item.title), [item.title]);

  return (
    <input
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => uid && value.trim() && value !== item.title && updateItem(uid, item.id, { title: value.trim() })}
      className="w-full bg-transparent text-title text-text focus:outline-none"
    />
  );
}

function EditableDescription({ item, uid }: { item: Item; uid: string | undefined }) {
  const [value, setValue] = useState(item.description);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- same reasoning as EditableTitle above.
  useEffect(() => setValue(item.description), [item.description]);

  return (
    <textarea
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => uid && value !== item.description && updateItem(uid, item.id, { description: value })}
      placeholder="No description yet — add one, or wait for Ralph."
      rows={3}
      className="w-full resize-none rounded-lg bg-surface p-3 text-bodySm text-text placeholder:text-text-faint focus:outline-none"
    />
  );
}

function SecretBody({
  item,
  revealed,
  revealing,
  error,
  onReveal,
  onHide,
}: {
  item: Item;
  revealed: string | null;
  revealing: boolean;
  error: string | null;
  onReveal: () => void;
  onHide: () => void;
}) {
  return (
    <section className="mt-5">
      <p className="mb-1.5 text-eyebrow text-text-faint">SECRET</p>
      {revealed ? (
        <div className="flex items-center justify-between gap-3 rounded-lg bg-surface p-3.5">
          <code className="min-w-0 flex-1 truncate font-mono text-code text-text">{revealed}</code>
          <Button size="sm" variant="outline" onClick={onHide}>
            Hide
          </Button>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-border-strong p-3.5">
          <span className="flex items-center gap-2 text-bodySm text-text-muted">
            <icons.lock className="size-4" />
            Encrypted on this device
          </span>
          <Button size="sm" loading={revealing} onClick={onReveal}>
            Reveal
          </Button>
        </div>
      )}
      {error && <p className="mt-2 text-bodySm text-overdue">{error}</p>}
      <p className="mt-2 text-micro text-text-faint">Item: {item.title}</p>
    </section>
  );
}
