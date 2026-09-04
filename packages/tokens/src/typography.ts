/**
 * Swiss-adjacent type: one display face for headings carrying tight negative
 * tracking, one neutral face for everything else. Sizes are in px as plain
 * numbers so React Native can use them unmodified.
 *
 * The display face is loaded from a webfont on web and falls back to the system
 * UI face on mobile, where shipping two custom faces would cost more startup
 * time than the aesthetic gain is worth.
 */

export const fontFamily = {
  display: "'Clash Display', 'Satoshi', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  body: "'Satoshi', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  mono: "ui-monospace, 'SF Mono', SFMono-Regular, Menlo, Consolas, monospace",
} as const;

export interface TypeStyle {
  fontSize: number;
  lineHeight: number;
  fontWeight: '400' | '500' | '600' | '700' | '800';
  letterSpacing: number;
  family: 'display' | 'body' | 'mono';
}

export const type = {
  /** Section titles on an otherwise empty screen. */
  display: { fontSize: 44, lineHeight: 46, fontWeight: '800', letterSpacing: -1.8, family: 'display' },
  title:   { fontSize: 28, lineHeight: 32, fontWeight: '800', letterSpacing: -0.9, family: 'display' },
  heading: { fontSize: 20, lineHeight: 25, fontWeight: '700', letterSpacing: -0.4, family: 'display' },
  /** Item card titles. */
  subheading: { fontSize: 15, lineHeight: 20, fontWeight: '700', letterSpacing: -0.2, family: 'body' },
  body:    { fontSize: 15, lineHeight: 22, fontWeight: '400', letterSpacing: 0, family: 'body' },
  bodySm:  { fontSize: 13, lineHeight: 19, fontWeight: '400', letterSpacing: 0, family: 'body' },
  /** Descriptions and metadata under a title. */
  caption: { fontSize: 12, lineHeight: 17, fontWeight: '500', letterSpacing: 0, family: 'body' },
  /** Timestamps, counts. */
  micro:   { fontSize: 11, lineHeight: 14, fontWeight: '600', letterSpacing: 0, family: 'body' },
  /** All-caps label above a list. */
  eyebrow: { fontSize: 10.5, lineHeight: 14, fontWeight: '800', letterSpacing: 1.4, family: 'body' },
  /** Prompt bodies, code snippets, API keys. */
  code:    { fontSize: 13, lineHeight: 20, fontWeight: '400', letterSpacing: 0, family: 'mono' },
} satisfies Record<string, TypeStyle>;

export type TypeName = keyof typeof type;
