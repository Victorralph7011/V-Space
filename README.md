# V-Space

A personal storage device: one chat box you paste anything into, five
structured views over the same data, and search that actually finds things
again. Web (Next.js) and mobile (Expo) share one core.

> **The one idea:** sections are not silos. Everything you capture becomes one
> `item` document with a `kind` discriminator; "Prompt Library" is just
> `where kind == 'prompt'`. See [AGENTS.md](AGENTS.md).

## Status

Milestones 0–7 from the build plan are done: auth, chat capture (offline,
sub-millisecond classification), all five sections, item detail, global
search, reminders, AI enrichment (Gemini, free tier), and the encrypted
secrets vault — on **both** web and mobile, verified against a real Firebase
project. See [Verification](#verification) for exactly what's been checked.

## Stack

| Layer | Choice |
|---|---|
| Monorepo | npm workspaces (`packages/*`, `apps/web`, `apps/mobile`) |
| Web | Next.js 16 + Tailwind v4, deployed on Vercel |
| Mobile | Expo SDK 57 (React Native 0.86) |
| Data | Firebase Auth + Firestore + Storage |
| AI | Gemini 3.6 Flash (free tier), behind a swappable provider interface |
| Secrets | AES-256-GCM, client-side, key never leaves the device |

## Setup

### 1. Firebase project

1. Create a project at [console.firebase.google.com](https://console.firebase.google.com).
2. Enable **Authentication** (Email/Password, and Google if you want it).
3. Enable **Firestore** (Build → Firestore Database → Create database).
4. Enable **Storage** (Build → Storage → **Get started**) — this one specific
   step has to happen in the console; the CLI deploy below cannot provision
   the bucket itself, only push rules to a bucket that already exists.
5. Add a **Web app** (Project Settings → General → Your apps) — this config is
   used by both `apps/web` and `apps/mobile`, since mobile also uses the plain
   Firebase JS SDK.
6. Generate a **service account key** (Project Settings → Service accounts →
   Generate new private key) — this is for `apps/web`'s `/api/*` routes only.
7. Deploy the security rules and indexes from the repo root:
   ```bash
   npx firebase-tools deploy --only firestore:rules,firestore:indexes,storage
   ```

### 2. Gemini API key (free)

Get one at [aistudio.google.com/apikey](https://aistudio.google.com/apikey) —
no credit card required.

### 3. Environment variables

```bash
cp apps/web/.env.example apps/web/.env.local
cp apps/mobile/.env.example apps/mobile/.env.local
```

Fill in the Firebase web config in both, the service account (base64-encoded)
and Gemini key in `apps/web/.env.local` only. See the comments in each
`.env.example` for exact steps.

### 4. Install and run

```bash
npm install                  # installs every workspace from the repo root
npm run dev                  # apps/web at http://localhost:3000
npm run dev:mobile           # apps/mobile — scan the QR with Expo Go
```

`npm test` and `npm run typecheck` run across every workspace.

Optionally seed a test account with ~200 realistic items (find a uid in
Firebase Console → Authentication → Users), so search and the section lists
have something closer to real volume to work against:
```bash
npm run seed -- <uid>
```

## Repo layout

```
packages/tokens   design tokens — the only place a color is named
packages/core     platform-agnostic TypeScript: types, Firebase, items,
                  search, classify, crypto, vault — used unchanged by both apps
apps/web          Next.js 16 — also hosts /api/* (unfurl, classify, enrich,
                  health), which apps/mobile calls too
apps/mobile       Expo 57
```

The database schema and API contract aren't duplicated into this README —
they're documented as comments directly on the code that defines them, so they
can't drift out of date. Start at `packages/core/src/types/index.ts` for the
data model (the `Item` type is the whole system) and
`apps/web/src/app/api/*/route.ts` for the four endpoints.

## Deploying

- **Web**: push to GitHub, import into [Vercel](https://vercel.com), set the
  same env vars from `apps/web/.env.local` in the Vercel dashboard. Free
  Hobby tier is enough — that's the whole reason the AI routes live there
  instead of Firebase Cloud Functions.
- **Mobile**: `npx eas build` once you're ready for a real device build /
  app-store submission (not required for local development — Expo Go covers
  that). Set `EXPO_PUBLIC_API_URL` to the deployed Vercel URL so mobile's
  enrichment calls reach it.

## Verification

- `npm test` — 79 tests across the classifier, search index, vault crypto,
  and the Gemini response-sanitizing boundary.
- `npm run typecheck` — clean across all four workspaces.
- `npx eslint src --max-warnings=0` in `apps/web` and `apps/mobile` — clean.
- Verified end-to-end against a real Firebase project and a real Gemini key:
  sign-up/sign-in, Firestore security rules (deployed and enforced — an
  unauthenticated write is rejected), all five section pages, the chat
  capture pipeline (a pasted prompt lands in Prompt Library, a reminder
  phrase extracts the right date), and every `/api/*` route (`health`,
  `unfurl`, `classify`, `enrich`) called with a real ID token.
- Two real bugs were caught this way and fixed: React hooks were reachable
  from the main `@vspace/core` barrel, which broke every server-side import
  (Server Components, API routes) the moment Next's RSC boundary check
  traced the module graph — hooks now live behind a separate
  `@vspace/core/hooks` entry point (see `packages/core/src/hooks.ts`). And
  Gemini 3.6 Flash's internal "thinking" pass was silently consuming the
  entire `maxOutputTokens` budget before writing a single character of the
  actual answer, truncating the JSON response — both the token budget and
  the request timeout in `apps/web/src/lib/ai/gemini.ts` were raised to
  give it room.
- Image capture is implemented and code-complete but **not yet verified
  live** — it depends on the Storage bucket being provisioned in the
  Firebase console (step 4 above), which is a one-time manual action.

## Working on this repo

Standard git flow — nothing project-specific to set up:

```bash
git add -A
git commit -m "describe the change"
git push
```

Before committing, `npm test && npm run typecheck` from the repo root covers
every workspace in one pass. `apps/web/.env.local` and `apps/mobile/.env.local`
are git-ignored, so a fresh clone always starts from the checked-in
`.env.example` templates — see [Setup](#setup) above.
