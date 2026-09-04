/**
 * The only place in V-Space where a color, size, or type scale is named.
 *
 * Consumed three ways, all from these same files:
 *   - React Native imports the objects directly.
 *   - Next.js imports them for inline styles and JS-driven animation.
 *   - Tailwind reads `apps/web/src/app/tokens.css`, generated from here by
 *     `npm run gen:css`. That file is generated precisely so the web CSS can
 *     never drift from the values the mobile app is using.
 */
export * from './colors.ts';
export * from './layout.ts';
export * from './typography.ts';
