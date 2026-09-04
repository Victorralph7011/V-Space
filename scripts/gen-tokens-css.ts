/**
 * Generates `apps/web/src/app/tokens.css` from packages/tokens.
 *
 * Tailwind v4 resolves `@theme` at build time from literal CSS, so it cannot
 * read a JavaScript object — which is exactly how a design system ends up with
 * two divergent copies of its palette. Generating the CSS instead means the
 * numbers exist once, in TypeScript, and the stylesheet is a build artifact.
 *
 * Run with Node's native type stripping (no build step, no extra dependency):
 *   npm run gen:css
 *
 * This is the only file in the repo that imports with `.ts` extensions — Node's
 * ESM resolver requires them, while Turbopack and Metro do not want them in
 * application source.
 *
 * `spacing` from packages/tokens is intentionally not emitted here. Tailwind
 * v4's `--spacing-*` theme namespace backs width, height, max-width,
 * min-width, gap, padding, margin, and inset all at once — so a named entry
 * like `sm`/`md`/`lg` collides with Tailwind's own reserved scale names across
 * every one of those utilities, not just spacing. That's exactly what broke
 * `max-w-sm` on the auth pages: it silently resolved to this design system's
 * `spacing.sm` (8px) instead of Tailwind's built-in 24rem. See the comment on
 * `spacing` in packages/tokens/src/layout.ts for the full account. `radii` and
 * `durations` don't have this problem — `--radius-*` and `--duration-*` are
 * each used by exactly one utility category in Tailwind, so overriding them is
 * a real, intentional design-system override rather than a collision.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { light, dark } from '../packages/tokens/src/colors.ts';
import { radii, durations, easing, layout } from '../packages/tokens/src/layout.ts';
import { fontFamily, type } from '../packages/tokens/src/typography.ts';

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, '..', 'apps', 'web', 'src', 'app', 'tokens.css');

const kebab = (s: string) => s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

/** Palette entries become `--color-*` so Tailwind generates `bg-*`/`text-*` utilities. */
const colorVars = (p: Record<string, string>, indent = '  ') =>
  Object.entries(p)
    .map(([k, v]) => `${indent}--color-${kebab(k)}: ${v};`)
    .join('\n');

const lines: string[] = [];

lines.push('/*');
lines.push(' * GENERATED FILE — DO NOT EDIT.');
lines.push(' * Source: packages/tokens/src/*.ts   Regenerate: npm run gen:css');
lines.push(' */');
lines.push('');

// Non-color scales live in @theme so Tailwind emits utilities for them.
lines.push('@theme {');
lines.push('  /* ── Type ── */');
lines.push(`  --font-display: ${fontFamily.display};`);
lines.push(`  --font-body: ${fontFamily.body};`);
lines.push(`  --font-mono: ${fontFamily.mono};`);
lines.push('');
for (const [name, t] of Object.entries(type)) {
  lines.push(`  --text-${kebab(name)}: ${t.fontSize}px;`);
  lines.push(`  --text-${kebab(name)}--line-height: ${t.lineHeight}px;`);
  lines.push(`  --text-${kebab(name)}--font-weight: ${t.fontWeight};`);
  lines.push(`  --text-${kebab(name)}--letter-spacing: ${t.letterSpacing}px;`);
}
lines.push('');
lines.push('  /* ── Radii ── */');
for (const [k, v] of Object.entries(radii)) lines.push(`  --radius-${k}: ${v}px;`);
lines.push('');
lines.push('  /* ── Motion ── */');
for (const [k, v] of Object.entries(durations)) lines.push(`  --duration-${k}: ${v}ms;`);
lines.push(`  --ease-v: ${easing};`);
lines.push('');
lines.push('  /* ── Layout ── */');
for (const [k, v] of Object.entries(layout)) lines.push(`  --v-${kebab(k)}: ${v}px;`);
lines.push('');
lines.push('  /*');
lines.push('   * Colors are declared here so Tailwind emits the utility classes,');
lines.push('   * then re-pointed at live `--p-*` variables below. The utilities are');
lines.push('   * generated once; the values they resolve to follow the active theme.');
lines.push('   */');
for (const k of Object.keys(light)) {
  lines.push(`  --color-${kebab(k)}: var(--p-${kebab(k)});`);
}
lines.push('}');
lines.push('');

// The actual theme values. `:root` is light; dark is applied by an explicit
// `data-theme` (user chose it) or by the OS preference when they have not.
lines.push('/* ── Light (default) ── */');
lines.push(':root {');
lines.push(colorVars(light).replace(/--color-/g, '--p-'));
lines.push('  color-scheme: light;');
lines.push('}');
lines.push('');
lines.push('/* ── Dark ── */');
lines.push('@media (prefers-color-scheme: dark) {');
lines.push('  :root:not([data-theme="light"]) {');
lines.push(colorVars(dark, '    ').replace(/--color-/g, '--p-'));
lines.push('    color-scheme: dark;');
lines.push('  }');
lines.push('}');
lines.push('');
lines.push(':root[data-theme="dark"] {');
lines.push(colorVars(dark).replace(/--color-/g, '--p-'));
lines.push('  color-scheme: dark;');
lines.push('}');
lines.push('');

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, lines.join('\n'), 'utf8');
console.log(`gen:css → ${out}`);
