/**
 * Spacing is a 4px scale with two deliberate gaps (24, 40) where the eye needs
 * a real jump rather than the next increment. Values are unitless numbers so
 * React Native consumes them directly for `StyleSheet` values.
 *
 * Deliberately NOT emitted into `tokens.css` / Tailwind's `@theme` the way
 * colors and radii are. Tailwind v4 shares its `--spacing-*` namespace across
 * many utility categories at once — width, height, max-width, min-width, gap,
 * padding, margin, inset, translate — so a named key here (`sm`, `md`, `lg`…)
 * collides with Tailwind's own reserved scale names for *all* of them, not
 * just spacing. That collision is exactly what broke `max-w-sm` on the auth
 * pages: it silently resolved to this object's `sm: 8` (8px) instead of
 * Tailwind's built-in 24rem. The web app uses Tailwind's own default numeric
 * scale directly (`gap-2`, `px-4`, `mt-1.5`) rather than a named one — see
 * `scripts/gen-tokens-css.ts` for the full reasoning.
 */
export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  huge: 64,
} as const;

export const radii = {
  sm: 6,
  md: 10,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

export const durations = {
  /** Hover, press, checkbox — must feel instantaneous. */
  fast: 140,
  /** Panel and sheet transitions. */
  base: 240,
  /** Page-level reveals only. */
  slow: 420,
} as const;

/**
 * A single easing curve for the whole app. Shared with the GridStay design
 * system — a slow-in/slow-out that reads as mechanical rather than bouncy.
 */
export const easing = 'cubic-bezier(0.77, 0, 0.175, 1)' as const;

export const layout = {
  /** Max reading width for the centre column. */
  content: 760,
  /** Max width of the three-pane shell before it stops growing. */
  shell: 1440,
  /** Left navigation rail, desktop web only. */
  rail: 232,
  /** Right detail pane, desktop web only. */
  detail: 380,
  /** Below this the shell collapses to a single column + bottom tabs. */
  breakpoint: 768,
} as const;

export const zIndex = {
  base: 0,
  sticky: 10,
  overlay: 100,
  modal: 110,
  toast: 120,
} as const;
