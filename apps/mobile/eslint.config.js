const expoConfig = require('eslint-config-expo/flat');
const { defineConfig, globalIgnores } = require('eslint/config');

module.exports = defineConfig([
  ...expoConfig,
  globalIgnores(['.expo/**', 'node_modules/**', 'dist/**']),
  {
    rules: {
      // See apps/web/eslint.config.mjs for the identical reasoning: this
      // codebase's icon-selection pattern (KindGlyph, a fixed lookup over
      // module-level components) is exactly what the React Compiler rule
      // false-positives on, with no actual per-render component creation.
      'react-hooks/static-components': 'off',
    },
  },
]);
