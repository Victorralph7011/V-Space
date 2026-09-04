/**
 * Connects the vault's imperative call sites (capture, item detail) to one
 * passphrase prompt rendered once at the app root.
 *
 * A passphrase prompt cannot be a prop passed down from the screen that needs
 * it — capture happens from the chat composer, but a secret can just as
 * easily be the very first message ever sent, before any vault UI has had a
 * reason to mount. So this is a tiny publish/subscribe bridge: a call site
 * calls `requestPassphrase()` and awaits a promise; one `<VaultModal>` (web)
 * or `<VaultPrompt>` (mobile) is the sole subscriber, shows the right form,
 * and resolves it.
 *
 * Lives in `packages/core` rather than either app because the logic has no
 * platform dependency at all — it is exactly the kind of thing that would
 * otherwise get pasted into both apps and drift.
 */
export type VaultPromptMode = 'create' | 'unlock';

export interface PendingVaultPrompt {
  mode: VaultPromptMode;
  /** Set on a retry after a failed verification, to explain why it's asking again. */
  error?: string;
  resolve: (passphrase: string | null) => void;
}

type Listener = (request: PendingVaultPrompt | null) => void;

let current: PendingVaultPrompt | null = null;
const listeners = new Set<Listener>();

export function subscribeVaultPrompt(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Resolves to the entered passphrase, or null if the user cancelled. */
export function requestPassphrase(mode: VaultPromptMode, error?: string): Promise<string | null> {
  return new Promise((resolve) => {
    current = { mode, error, resolve };
    for (const listener of listeners) listener(current);
  });
}

export function resolvePassphrase(passphrase: string | null): void {
  current?.resolve(passphrase);
  current = null;
  for (const listener of listeners) listener(null);
}
