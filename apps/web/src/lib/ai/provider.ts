import 'server-only';
import type { ItemKind } from '@vspace/core';

/**
 * The seam the plan calls for: one function, `describe()`, that every
 * enrichment call site depends on. Swapping the free Gemini tier for a paid
 * provider later is "write a new provider file, change one env var" —
 * nothing in `/api/enrich` or anywhere else changes, because nothing outside
 * this file knows which model answered.
 */
export interface EnrichInput {
  kind: ItemKind;
  title: string;
  /** The pasted text — a prompt, a note, an idea. Never present for a `link`. */
  body: string;
  url: string | null;
  /** From /api/unfurl, when this is a link. */
  unfurled: { title: string | null; description: string | null; siteName: string | null } | null;
  existingTags: string[];
}

export interface EnrichOutput {
  description: string;
  tags: string[];
  /** Only set when the model is confident this is a better title than what's stored. */
  title?: string;
  /** ISO date, only set when the text clearly contains a deadline. */
  dueAt?: string | null;
  /** Only set when the model believes the local classifier's kind was wrong. */
  kind?: ItemKind;
}

export interface AiProvider {
  readonly name: string;
  describe(input: EnrichInput): Promise<EnrichOutput>;
  /** Cheap reachability check for /api/health — must not consume real quota. */
  isConfigured(): boolean;
}

let cached: AiProvider | null = null;

/**
 * Picks the provider from `AI_PROVIDER` (default `gemini`). The whole point of
 * this indirection is that this is the *only* line that has to change to add
 * a second provider, selected the same way.
 */
export async function getAiProvider(): Promise<AiProvider> {
  if (cached) return cached;

  const name = process.env.AI_PROVIDER ?? 'gemini';
  switch (name) {
    case 'gemini': {
      const { geminiProvider } = await import('./gemini');
      cached = geminiProvider;
      return cached;
    }
    default:
      throw new Error(`Unknown AI_PROVIDER "${name}".`);
  }
}
