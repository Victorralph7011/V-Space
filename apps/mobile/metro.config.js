const { getDefaultConfig } = require('expo/metro-config');
const path = require('node:path');

/**
 * Makes Metro see the whole npm workspace, not just apps/mobile.
 *
 * `@vspace/core` and `@vspace/tokens` are npm-workspace symlinks into
 * `packages/*` — real TypeScript source, no build step. Metro's default
 * config only watches the app's own directory, so without the two settings
 * below it would (a) never notice an edit to a file in `packages/core` and
 * (b) fail to resolve the dependency at all, because Metro's default
 * resolver looks for `node_modules` starting at the project root and
 * stopping there, not walking up to the workspace root the way Node itself
 * does.
 */
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '..', '..');

const config = getDefaultConfig(projectRoot);

// Watch the whole workspace so edits to packages/core and packages/tokens
// trigger a refresh, not just edits inside apps/mobile.
config.watchFolders = [workspaceRoot];

// Resolve node_modules from both this app's own folder (Expo's own deps,
// which stay unhoisted) and the workspace root (everything hoisted there,
// including the @vspace/* symlinks).
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

module.exports = config;
