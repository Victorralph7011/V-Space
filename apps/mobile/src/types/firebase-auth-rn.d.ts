import type { Persistence, ReactNativeAsyncStorage } from '@firebase/auth';

/**
 * Fills a real gap in `@firebase/auth`'s own published types, not a
 * workaround for a mistake in our code.
 *
 * `@firebase/auth`'s package.json exports a `"react-native"` condition whose
 * runtime build genuinely does export `getReactNativePersistence` — Metro
 * resolves it correctly at bundle time, and the app works. But that same
 * exports map lists a `"types"` condition *before* `"react-native"`, and
 * Node/TypeScript's exports resolution picks the first matching condition
 * regardless of platform — so `tsc` always resolves this package's types to
 * the platform-generic `auth-public.d.ts`, which never declares this
 * function (only the `ReactNativeAsyncStorage` type it takes). The signature
 * below is copied verbatim from
 * `@firebase/auth/dist/rn/src/platform_react_native/persistence/react_native.d.ts`
 * — the file the runtime build actually ships and uses.
 */
declare module '@firebase/auth' {
  export function getReactNativePersistence(storage: ReactNativeAsyncStorage): Persistence;
}
