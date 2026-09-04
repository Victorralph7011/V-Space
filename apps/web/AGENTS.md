See ../../AGENTS.md for the whole-repo conventions.

Next.js in this repo is v16 with Turbopack, which has real breaking changes
against training data. Read `node_modules/next/dist/docs/` before writing
anything here. `src/app/tokens.css` is generated — edit
`packages/tokens/src/*.ts` and run `npm run gen:css` from the repo root instead.
