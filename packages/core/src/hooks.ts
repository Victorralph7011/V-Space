/**
 * The React-hooks entry point of @vspace/core — `import { useItem, ... } from
 * '@vspace/core/hooks'`, always separate from the main `'@vspace/core'` entry.
 *
 * This split exists because of a real bug it fixes: the main barrel used to
 * re-export these hooks too, and that broke every server-side consumer of
 * `@vspace/core` — Next.js Server Components and every `/api/*` route,
 * including ones (like `items-admin.ts`) that never reference a hook by name.
 * The reason is that Next's RSC boundary check has to trace the *whole*
 * module graph reachable from an import, not just the named exports actually
 * used — so as long as `useEffect`/`useState`-using code was reachable at all
 * from `'@vspace/core'`, importing anything from it server-side failed with
 * "You're importing a module that depends on `useEffect` into a React Server
 * Component module."
 *
 * The fix is this file: hooks live in a module the main barrel never touches,
 * so `'@vspace/core'` is safe to import from literally anywhere — a Server
 * Component, an API route, a plain Node script — and only a Client Component
 * ever needs `'@vspace/core/hooks'`.
 */
export * from './items/hooks.ts';
export * from './messages/hooks.ts';
