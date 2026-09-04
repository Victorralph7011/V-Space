import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts', 'src/app/tokens.css']),
  {
    rules: {
      /**
       * `react-hooks/static-components` (the React Compiler's ESLint rule,
       * new with Next 16 / React 19.2) assumes any JSX tag stored in a
       * variable might be a freshly-created component type on every render,
       * so it can't verify a lookup is stable. It false-positives across this
       * codebase's icon system (`iconForKind`, and every place a `LucideIcon`
       * is passed as a prop — `NavItem`, `EmptyState`, item cards, chat
       * bubbles, the command palette, the item detail header): all of it
       * selects among a fixed, module-level set of icon components imported
       * once in `components/ui/Icon.tsx`. Nothing is ever created during
       * render — there is no component definition anywhere in this pattern
       * that varies, so the "resets its state each render" failure mode the
       * rule exists to catch cannot occur; a Lucide icon has no state to
       * reset in the first place. Disabled rather than threading a
       * kind-based switch statement through eight call sites to satisfy a
       * check that has nothing to actually check here.
       */
      'react-hooks/static-components': 'off',
    },
  },
]);

export default eslintConfig;
