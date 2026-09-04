import 'server-only';
import type { AiProvider, EnrichInput, EnrichOutput } from './provider';
import { RESPONSE_SCHEMA, SYSTEM_PROMPT, buildPrompt, sanitize } from './gemini-format';

/**
 * Gemini 2.5 Flash via the free Google AI Studio tier — no billing account,
 * no credit card, called with plain `fetch` rather than the `@google/genai`
 * SDK. One dependency fewer for one route, and the entire request shape is
 * about fifteen lines; a full SDK buys nothing here that's worth the install.
 *
 * `responseSchema` constrains Gemini to return exactly the shape declared in
 * `gemini-format.ts`, so this never has to hope the model remembered to emit
 * valid JSON. See that file for the prompt and the response-sanitizing logic
 * — split out and dependency-free so it is unit testable.
 */
const MODEL = process.env.GEMINI_MODEL ?? 'gemini-3.6-flash';
const ENDPOINT = (key: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`;

// gemini-3.6-flash's thinking pass (see the maxOutputTokens comment below)
// adds real, variable latency on top of the actual generation — 15s cut off
// a request that eventually would have completed, surfacing a spurious
// "aborted" error on `/api/classify` and `/api/enrich` in testing. 25s leaves
// headroom under the 30s Vercel function duration these routes declare.
const TIMEOUT_MS = 25_000;

async function describe(input: EnrichInput): Promise<EnrichOutput> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set.');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(ENDPOINT(apiKey), {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildPrompt(input) }] }],
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA,
          temperature: 0.3,
          // gemini-3.6-flash spends a real chunk of this budget on an internal
          // "thinking" pass before it writes a single character of the actual
          // JSON answer — observed around 500 tokens of thinking for a ~80
          // token response. A low cap here doesn't just shorten the answer,
          // it can consume the whole budget on thinking and leave the model
          // with nothing to emit, truncating mid-JSON and failing to parse.
          // 2048 leaves comfortable headroom above the observed thinking cost.
          maxOutputTokens: 2048,
        },
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`Gemini ${response.status}: ${body.slice(0, 200)}`);
    }

    const payload = await response.json();
    const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof text !== 'string') throw new Error('Gemini returned no text.');

    return sanitize(JSON.parse(text), input);
  } finally {
    clearTimeout(timeout);
  }
}

export const geminiProvider: AiProvider = {
  name: 'gemini',
  describe,
  isConfigured: () => Boolean(process.env.GEMINI_API_KEY),
};
