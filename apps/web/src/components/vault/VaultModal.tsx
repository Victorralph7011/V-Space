'use client';

import { useEffect, useRef, useState } from 'react';
import { subscribeVaultPrompt, resolvePassphrase, type PendingVaultPrompt } from '@vspace/core';
import { icons } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';

/**
 * The one passphrase prompt for the whole app, rendered once at the root and
 * driven entirely by `@vspace/core`'s `prompt-bridge.ts`. See that file for why a modal that
 * can be triggered from a chat message or an item detail page has to work
 * this way rather than as a prop.
 */
export function VaultModal() {
  const [request, setRequest] = useState<PendingVaultPrompt | null>(null);
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => subscribeVaultPrompt(setRequest), []);

  useEffect(() => {
    if (request) {
      // Clearing the field when a new prompt arrives (not on every render) is
      // the trigger this effect exists for; there's no render-time value to
      // derive it from since `request` comes from an external subscription.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setValue('');
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [request]);

  if (!request) return null;

  function submit() {
    if (!value) return;
    resolvePassphrase(value);
  }

  return (
    <div className="fixed inset-0 z-modal flex items-center justify-center bg-overlay px-4">
      <div className="v-enter w-full max-w-sm rounded-2xl border border-border bg-bg-elevated p-6">
        <div className="mb-4 flex size-10 items-center justify-center rounded-full bg-surface text-text-muted">
          <icons.lock className="size-4.5" />
        </div>

        <h2 className="text-heading text-text">
          {request.mode === 'create' ? 'Create a vault passphrase' : 'Unlock your vault'}
        </h2>

        <p className="mt-1.5 text-bodySm text-text-muted">
          {request.mode === 'create'
            ? "This encrypts API keys and other secrets on your device. There is no recovery — if you forget it, whatever's encrypted with it is gone for good."
            : 'Enter your passphrase to view this secret.'}
        </p>

        <input
          ref={inputRef}
          type="password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="Passphrase"
          className="mt-4 h-11 w-full rounded-lg border border-border bg-surface px-3.5 text-body text-text placeholder:text-text-faint focus:border-border-strong focus:outline-none"
        />

        {request.error && <p className="mt-2 text-bodySm text-overdue">{request.error}</p>}

        <div className="mt-5 flex gap-2.5">
          <Button variant="outline" className="flex-1" onClick={() => resolvePassphrase(null)}>
            Cancel
          </Button>
          <Button className="flex-1" disabled={!value} onClick={submit}>
            {request.mode === 'create' ? 'Create' : 'Unlock'}
          </Button>
        </div>
      </div>
    </div>
  );
}
