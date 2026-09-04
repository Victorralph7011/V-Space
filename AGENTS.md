# V-Space

A personal storage device: one chat box you dump anything into, five structured
views over the same data, and search that actually finds things again.

## The one architectural idea

**Sections are not silos. They are saved views over a single item stream.**

Everything captured becomes one `item` document with a `kind` discriminator.
"Prompt Library" is `where kind == 'prompt'`. Do not create a per-section
collection, a per-section type, or a per-section service. If you find yourself
writing `promptService.ts`, stop — it belongs in `items/services.ts`.

## Framework versions differ from your training data

<!-- BEGIN:nextjs-agent-rules -->
This is NOT the Next.js you know. APIs, conventions, and file structure may all
differ from your training data. Read the relevant guide in
`apps/web/node_modules/next/dist/docs/` before writing any web code. Heed
deprecation notices.
<!-- END:nextjs-agent-rules -->

Expo HAS CHANGED. Read the exact versioned docs at
https://docs.expo.dev/versions/v57.0.0/ before writing any mobile code.

## Layout

```
packages/tokens   design tokens — the ONLY place a color is named
packages/core     platform-agnostic TS: types, firebase, items, search, crypto
apps/web          Next.js 16 + Tailwind v4   (also hosts /api/* on Vercel)
apps/mobile       Expo 57
```

### The rule that keeps `packages/core` working

`packages/core` imports neither `react-native` nor `document`/`window`. It runs
in Metro and in Next's server and client bundles unchanged. Platform capabilities
(crypto, storage) are injected once at startup via `configure()`. Break this and
Metro fails in ways that take a day to diagnose.

## Conventions

- Feature folders are `{services,hooks}.ts` pairs (services = Firestore I/O,
  hooks = React subscriptions). Ported from the SpaceM project.
- Timestamps are ISO strings end-to-end, never Firestore `Timestamp` objects.
  See `packages/core/src/shared/firestore.ts` for why.
- Comments explain *why*, not *what*. If the code says what it does, don't repeat it.
- Monochrome only. No color enters the UI except through `packages/tokens`.

## TypeScript syntax constraint

`packages/core` and `packages/tokens` run directly under Node's type stripping
(`npm test`, `npm run gen:css`) with no build step. Type stripping erases types;
it cannot *transform* syntax. So these are unavailable in those packages:

- constructor parameter properties (`constructor(readonly x: T)`) — write the
  field and the assignment out
- `enum` — use a union type plus an `as const` object
- `namespace`, and `experimentalDecorators`

Relative imports in those packages carry an explicit `.ts` extension, which is
what lets Node, Turbopack and Metro all resolve them without a loader.
