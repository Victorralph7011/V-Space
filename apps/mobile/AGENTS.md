See ../../AGENTS.md for the whole-repo conventions.

Expo HAS CHANGED. Read the exact versioned docs at
https://docs.expo.dev/versions/v57.0.0/ before writing any code here.

`@vspace/core` and `@vspace/tokens` are consumed straight from their
TypeScript source via the npm workspace symlink — see metro.config.js for the
resolver config that makes that work. There is no build step for either
package; editing them takes effect on the next Metro refresh.
