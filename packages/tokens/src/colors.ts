/**
 * Strictly monochrome, in two themes.
 *
 * The product has no brand color. Emphasis is made with contrast and weight
 * alone — ink on paper, or paper on ink. This is a constraint, not an
 * oversight: a library screen showing reels, prompts, code and photographs is
 * already visually loud, and every one of those thumbnails brings its own
 * colors. A neutral chrome is the only way the *app* stays quiet while its
 * contents do not.
 *
 * The two palettes are deliberately symmetric — same token names, inverted
 * roles — so a component written against `text` / `bg` / `surface` is correct
 * in both themes without a single conditional.
 */

export type ThemeName = 'light' | 'dark';

export interface Palette {
  /** Page background, furthest back. */
  bg: string;
  /** Raised panes: sidebars, sheets, the composer. */
  bgElevated: string;
  /** Cards and inputs sitting on `bg`. */
  surface: string;
  /** Hover state for `surface`. */
  surfaceHi: string;
  /** Active/pressed state for `surface`. */
  surfacePress: string;

  /** Hairline dividers. 1px, low contrast — structure without lines shouting. */
  border: string;
  /** Focused inputs and selected cards. */
  borderStrong: string;

  /** Primary reading text. */
  text: string;
  /** Secondary text: descriptions, metadata. */
  textMuted: string;
  /** Tertiary: timestamps, placeholders, eyebrow labels. */
  textFaint: string;
  /** Text drawn on top of `accent`. */
  textInverse: string;

  /** The single emphasis color: pure ink in light, pure paper in dark. */
  accent: string;
  /** Accent at rest / disabled. */
  accentDim: string;
  /** Tinted fills — selected rows, active chips. */
  accentSoft: string;

  /**
   * Direction, not alarm. In a monochrome system "done" reads as dimmer and
   * "overdue" as fuller-contrast; a red here would be the only color on the
   * screen and would scream at you for a homework deadline.
   */
  done: string;
  overdue: string;

  /** Modal scrims. */
  overlay: string;
}

export const light: Palette = {
  bg: '#FFFFFF',
  bgElevated: '#FAFAFA',
  surface: '#F4F4F5',
  surfaceHi: '#EBEBEC',
  surfacePress: '#E0E0E2',

  border: '#E6E6E8',
  borderStrong: '#C9C9CD',

  text: '#0A0A0B',
  textMuted: '#6B6B72',
  textFaint: '#9C9CA3',
  textInverse: '#FFFFFF',

  accent: '#0A0A0B',
  accentDim: '#3A3A41',
  accentSoft: 'rgba(10, 10, 11, 0.06)',

  done: '#9C9CA3',
  overdue: '#0A0A0B',

  overlay: 'rgba(10, 10, 11, 0.44)',
};

export const dark: Palette = {
  bg: '#08080A',
  bgElevated: '#101012',
  surface: '#17171A',
  surfaceHi: '#212125',
  surfacePress: '#2C2C31',

  border: '#26262B',
  borderStrong: '#3A3A41',

  text: '#FAFAFA',
  textMuted: '#9C9CA3',
  textFaint: '#5F5F67',
  textInverse: '#08080A',

  accent: '#FFFFFF',
  accentDim: '#C6C6CC',
  accentSoft: 'rgba(255, 255, 255, 0.08)',

  done: '#5F5F67',
  overdue: '#FFFFFF',

  overlay: 'rgba(8, 8, 10, 0.72)',
};

export const palettes: Record<ThemeName, Palette> = { light, dark };

/**
 * Greyscale gradient pairs for avatars and missing-image placeholders, picked
 * deterministically from a seed so the same item always renders the same
 * placeholder. Greyscale for the same reason as everything else — a broken
 * thumbnail must not become the brightest thing on the screen.
 */
export const gradients: readonly (readonly [string, string])[] = [
  ['#3C3C44', '#16161A'],
  ['#5A5A64', '#232329'],
  ['#2A2A30', '#0E0E11'],
  ['#6E6E7A', '#2E2E35'],
  ['#48484F', '#1B1B1F'],
  ['#7E7E8A', '#3A3A42'],
  ['#333339', '#121216'],
  ['#62626C', '#28282E'],
];

export function gradientFor(seed: string): readonly [string, string] {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return gradients[hash % gradients.length]!;
}
