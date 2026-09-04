import type { ItemKind } from '@vspace/core';
import type { EnrichInput, EnrichOutput } from './provider';

/**
 * The prompt-building and response-sanitizing halves of the Gemini provider,
 * with no `fetch` and no `server-only` import — kept separate purely so this
 * logic (especially `sanitize`, the boundary where an LLM's raw output
 * becomes data written to Firestore) can be unit tested directly.
 */

export const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    description: { type: 'STRING' },
    tags: { type: 'ARRAY', items: { type: 'STRING' } },
    title: { type: 'STRING', nullable: true },
    dueAt: { type: 'STRING', nullable: true },
    kind: { type: 'STRING', nullable: true },
  },
  required: ['description', 'tags'],
} as const;

const VALID_KINDS: ReadonlySet<string> = new Set([
  'link', 'prompt', 'image', 'idea', 'reminder', 'note', 'code',
]);

export const SYSTEM_PROMPT = `You are Ralph, the enrichment engine inside V-Space, a
personal archive app. Given something the user saved, write a short, useful
description they will read weeks later trying to remember what this was and
why they saved it.

Rules:
- description: one or two plain sentences. No hedging, no "this appears to
  be...". State what it is and why it might be useful.
- tags: 2-5 short lowercase keywords, no spaces (use hyphens), no leading #.
- title: only set this if you can write a clearly better title than the one
  given — otherwise omit it. Never invent facts not supported by the input.
- dueAt: only set this if the text contains an explicit, unambiguous deadline
  or date not already captured. Return a full ISO 8601 datetime, or omit it.
- kind: only set this if the given kind looks wrong for the content — e.g. it
  is filed as "note" but is clearly a "prompt" or an "idea". Omit it otherwise.
  Never return "secret" — that classification is never made by you.`;

export function buildPrompt(input: EnrichInput): string {
  const lines = [`Kind (as filed): ${input.kind}`, `Title: ${input.title}`];

  if (input.url) lines.push(`URL: ${input.url}`);
  if (input.unfurled) {
    if (input.unfurled.siteName) lines.push(`Site: ${input.unfurled.siteName}`);
    if (input.unfurled.title) lines.push(`Page title: ${input.unfurled.title}`);
    if (input.unfurled.description) lines.push(`Page description: ${input.unfurled.description}`);
  }
  if (input.body) lines.push(`Content:\n${input.body.slice(0, 4000)}`);
  if (input.existingTags.length) lines.push(`Existing tags: ${input.existingTags.join(', ')}`);

  return lines.join('\n');
}

/**
 * The model is constrained by `RESPONSE_SCHEMA` but not *trusted* — this is
 * the boundary where an LLM's output stops being "probably fine" and becomes
 * data written to the database, so every field is validated or dropped rather
 * than passed through.
 */
export function sanitize(raw: unknown, input: EnrichInput): EnrichOutput {
  const obj = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;

  const description = typeof obj.description === 'string' ? obj.description.trim().slice(0, 500) : '';

  const tags = Array.isArray(obj.tags)
    ? obj.tags
        .filter((t): t is string => typeof t === 'string')
        .map((t) => t.trim().toLowerCase().replace(/^#/, '').replace(/\s+/g, '-'))
        .filter((t) => t.length > 0 && t.length <= 30)
        .slice(0, 5)
    : [];

  const result: EnrichOutput = { description, tags };

  if (typeof obj.title === 'string' && obj.title.trim() && obj.title.trim() !== input.title) {
    result.title = obj.title.trim().slice(0, 120);
  }

  if (typeof obj.dueAt === 'string') {
    const parsed = new Date(obj.dueAt);
    if (!Number.isNaN(parsed.getTime())) result.dueAt = parsed.toISOString();
  }

  if (typeof obj.kind === 'string' && VALID_KINDS.has(obj.kind)) {
    result.kind = obj.kind as ItemKind;
  }

  return result;
}
