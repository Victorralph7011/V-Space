import type { ItemKind, ItemSource, IsoDate } from '../types/index.ts';

/**
 * A rules-based classifier that runs on-device in well under a millisecond.
 *
 * This is the load-bearing piece of the capture pipeline, not a fallback. When
 * you paste a reel, this is what decides it is a `link` from `instagram` and
 * puts it in Links Space *before the network is even consulted*. Ralph's job is
 * to add a description on top of a decision already made here.
 *
 * The consequence is that capture never fails and never waits: with the Wi-Fi
 * off, on a dead free-tier quota, or with AI switched off entirely, pasting
 * something still files it correctly. That property is worth more than the
 * accuracy Ralph could add by classifying it instead.
 */

export interface Classification {
  kind: ItemKind;
  source: ItemSource;
  title: string;
  url: string | null;
  tags: string[];
  dueAt: IsoDate | null;
  /**
   * How sure the rules are. Below CONFIDENCE_ASK_RALPH the UI still files the
   * item immediately, but flags it for the model to reconsider the kind.
   */
  confidence: number;
}

export const CONFIDENCE_ASK_RALPH = 0.7;

const URL_RE = /\bhttps?:\/\/[^\s<>"')]+/i;

const HOST_SOURCES: ReadonlyArray<[RegExp, ItemSource]> = [
  [/(^|\.)instagram\.com$/i, 'instagram'],
  [/(^|\.)(youtube\.com|youtu\.be)$/i, 'youtube'],
  [/(^|\.)(twitter\.com|x\.com)$/i, 'x'],
  [/(^|\.)github\.com$/i, 'github'],
  [/(^|\.)leetcode\.com$/i, 'leetcode'],
  [/(^|\.)reddit\.com$/i, 'reddit'],
  [/(^|\.)linkedin\.com$/i, 'linkedin'],
];

/**
 * Phrases that mean "this is an instruction for a model", not prose. Drawn from
 * how prompts actually get written rather than from a formal grammar — a real
 * prompt in the wild opens with a role assignment or an imperative far more
 * often than it announces itself.
 */
const PROMPT_MARKERS = [
  /\bact like\b/i,
  /\bact as\b/i,
  /\byou are (a|an|my)\b/i,
  /\bsystem prompt\b/i,
  /\bignore (all )?previous\b/i,
  /\brespond (only )?(in|with)\b/i,
  /\bstep[- ]by[- ]step\b/i,
  /\byour (task|role|job) is\b/i,
  /\bdo not (explain|apologi[sz]e|include)\b/i,
];

const IDEA_MARKERS = [
  /\bidea\b/i,
  /\bstartup\b/i,
  /\bwhat if\b/i,
  /\bbuild an? app\b/i,
  /\bbusiness model\b/i,
  /\bside project\b/i,
];

const CODE_MARKERS =
  /^\s{4}\S|;\s*$|\b(function|const|let|class|def|import|public static|SELECT)\b/m;

const CODE_FENCE = /^```|\n```/;

/**
 * A key looks like a key: long, high-entropy, no spaces, and usually carrying a
 * recognisable vendor prefix. Matching the prefixes catches the common cases;
 * the labelled-assignment rule catches the rest without dragging in every
 * base64 blob that happens to be long.
 */
const SECRET_MARKERS = [
  /\bsk-ant-[A-Za-z0-9_-]{16,}/,
  /\bsk-[A-Za-z0-9_-]{16,}/,
  /\bAIza[0-9A-Za-z_-]{30,}/,
  /\bghp_[A-Za-z0-9]{30,}/,
  /\bxox[baprs]-[A-Za-z0-9-]{10,}/,
  /\b(api[_ -]?key|secret|token|password|passwd)\b\s*[:=]\s*\S{8,}/i,
];

const REMINDER_MARKERS = [
  /\b(remind|reminder|deadline|due|submit|assignment|exam|viva|interview|meeting|appointment)\b/i,
  /\bby (tomorrow|today|tonight|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
];

// ─────────────────────────────────────────────────────────────────────────────

export function classify(input: string, now: Date = new Date()): Classification {
  const text = input.trim();
  const urlMatch = text.match(URL_RE);
  const url = urlMatch ? urlMatch[0].replace(/[.,;:]+$/, '') : null;
  const tags = extractHashtags(text);
  const dueAt = extractDueDate(text, now);

  // Secrets win over everything. Misfiling a key as a note would put it in the
  // clear, so the rule that protects it has to run before any other match.
  if (SECRET_MARKERS.some((re) => re.test(text))) {
    return {
      kind: 'secret',
      source: 'manual',
      title: firstLine(stripSecretValue(text)) || 'Saved credential',
      url: null,
      tags,
      dueAt: null,
      confidence: 0.95,
    };
  }

  if (url) {
    const source = sourceForUrl(url);
    return {
      kind: 'link',
      source,
      // Provisional only — /api/unfurl replaces this with the real page title
      // within about a third of a second. It exists so the card is never blank.
      title: provisionalTitleForUrl(url, source),
      url,
      tags,
      dueAt,
      confidence: 0.95,
    };
  }

  // An explicit date phrase plus reminder language is the strongest non-URL
  // signal there is, so it outranks the softer text heuristics below.
  if (dueAt && REMINDER_MARKERS.some((re) => re.test(text))) {
    return {
      kind: 'reminder',
      source: 'manual',
      title: firstLine(text),
      url: null,
      tags,
      dueAt,
      confidence: 0.9,
    };
  }

  if (PROMPT_MARKERS.some((re) => re.test(text))) {
    return {
      kind: 'prompt',
      source: 'manual',
      title: firstLine(text),
      url: null,
      tags,
      dueAt,
      confidence: text.length > 120 ? 0.9 : 0.72,
    };
  }

  if (CODE_FENCE.test(text) || CODE_MARKERS.test(text)) {
    return {
      kind: 'code',
      source: 'manual',
      title: firstLine(text.replace(/```\w*/g, '').trim()),
      url: null,
      tags,
      dueAt,
      confidence: 0.8,
    };
  }

  if (IDEA_MARKERS.some((re) => re.test(text))) {
    return {
      kind: 'idea',
      source: 'manual',
      title: firstLine(text),
      url: null,
      tags,
      dueAt,
      confidence: 0.75,
    };
  }

  if (dueAt) {
    return {
      kind: 'reminder',
      source: 'manual',
      title: firstLine(text),
      url: null,
      tags,
      dueAt,
      confidence: 0.65,
    };
  }

  // Nothing matched. `note` is the always-available landing place — the reason
  // capture cannot fail. Low confidence asks Ralph to take a second look.
  return {
    kind: 'note',
    source: 'manual',
    title: firstLine(text),
    url: null,
    tags,
    dueAt: null,
    confidence: 0.4,
  };
}

/** Classification for a file the user attached rather than typed. */
export function classifyUpload(fileName: string, contentType: string): Classification {
  const isImage = contentType.startsWith('image/');
  return {
    kind: isImage ? 'image' : 'note',
    source: 'upload',
    title: fileName.replace(/\.[^.]+$/, '') || 'Untitled',
    url: null,
    tags: [],
    dueAt: null,
    confidence: 0.95,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

export function sourceForUrl(url: string): ItemSource {
  const host = safeHost(url);
  if (!host) return 'web';
  for (const [re, source] of HOST_SOURCES) if (re.test(host)) return source;
  return 'web';
}

export function safeHost(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

function provisionalTitleForUrl(url: string, source: ItemSource): string {
  if (source === 'instagram') return /\/reel\//.test(url) ? 'Instagram reel' : 'Instagram post';
  if (source === 'youtube') return /shorts\//.test(url) ? 'YouTube short' : 'YouTube video';
  if (source === 'leetcode') return 'LeetCode problem';
  if (source === 'github') return 'GitHub repository';
  return safeHost(url) ?? 'Saved link';
}

function firstLine(text: string): string {
  const line = text.split('\n').find((l) => l.trim().length > 0)?.trim() ?? '';
  if (!line) return 'Untitled';
  return line.length > 90 ? `${line.slice(0, 87).trimEnd()}…` : line;
}

/** Keep the label, drop the value, so a secret's title is safe to show. */
function stripSecretValue(text: string): string {
  return text.replace(/\S{20,}/g, '••••');
}

export function extractHashtags(text: string): string[] {
  const found = text.match(/#[\p{L}\p{N}_-]{2,30}/gu) ?? [];
  return [...new Set(found.map((t) => t.slice(1).toLowerCase()))];
}

// ── Date extraction ──────────────────────────────────────────────────────────

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

/**
 * Months are matched as "abbreviation plus an optional remainder" rather than
 * as full names, because people type "25 dec" far more often than "25 december".
 *
 * The optional remainder is what stops the abbreviation from matching inside an
 * ordinary word: after `mar` the pattern requires either a word boundary or the
 * literal `ch`, so "submit marks by friday" does not parse as March.
 */
const MONTH_PATTERNS = [
  'jan(?:uary)?',
  'feb(?:ruary)?',
  'mar(?:ch)?',
  'apr(?:il)?',
  'may',
  'jun(?:e)?',
  'jul(?:y)?',
  'aug(?:ust)?',
  'sep(?:t|tember)?',
  'oct(?:ober)?',
  'nov(?:ember)?',
  'dec(?:ember)?',
];

const MONTH_ALT = MONTH_PATTERNS.join('|');

/** Maps a matched month word back to its 0-based index via its first three letters. */
const MONTH_INDEX: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

const monthIndexOf = (word: string): number => MONTH_INDEX[word.slice(0, 3).toLowerCase()] ?? -1;

const DAY_MS = 86_400_000;

/**
 * Recognises the date phrasings people actually type into a self-chat —
 * "friday 6pm", "tomorrow", "by 25 dec", "on 3/11" — and nothing more. Anything
 * subtler is Ralph's job; this only has to be right often enough to be useful,
 * and cheap enough to run on every paste.
 *
 * `now` is a parameter rather than a `new Date()` call so the behaviour is
 * testable and so "tomorrow" resolves against an explicit clock.
 */
export function extractDueDate(text: string, now: Date = new Date()): IsoDate | null {
  const lower = text.toLowerCase();
  const time = extractTime(lower);

  const at = (d: Date): IsoDate => {
    const out = new Date(d);
    out.setHours(time?.h ?? 9, time?.m ?? 0, 0, 0);
    return out.toISOString();
  };

  if (/\btonight\b/.test(lower)) {
    const d = new Date(now);
    // "tonight" with no explicit time means the evening, not 9am.
    d.setHours(time?.h ?? 20, time?.m ?? 0, 0, 0);
    return d.toISOString();
  }

  if (/\btoday\b/.test(lower)) return at(now);

  if (/\btomorrow\b/.test(lower)) {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    return at(d);
  }

  const weekday = WEEKDAYS.findIndex((w) => new RegExp(`\\b${w}\\b`).test(lower));
  if (weekday >= 0) {
    const d = new Date(now);
    // Always the *next* occurrence: saying "friday" on a Friday means the one
    // coming, not the one already underway.
    const delta = (weekday - d.getDay() + 7) % 7 || 7;
    d.setDate(d.getDate() + delta);
    return at(d);
  }

  // "25 dec" / "dec 25", optionally with a year.
  const dayMonth = lower.match(
    new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(${MONTH_ALT})\\b(?:\\s+(\\d{4}))?`),
  );
  const monthDay = lower.match(
    new RegExp(`\\b(${MONTH_ALT})\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b(?:,?\\s+(\\d{4}))?`),
  );

  const md = dayMonth
    ? { day: Number(dayMonth[1]), month: monthIndexOf(dayMonth[2]!), year: dayMonth[3] }
    : monthDay
      ? { day: Number(monthDay[2]), month: monthIndexOf(monthDay[1]!), year: monthDay[3] }
      : null;

  if (md && md.month >= 0 && md.day >= 1 && md.day <= 31) {
    const year = md.year ? Number(md.year) : now.getFullYear();
    const d = new Date(year, md.month, md.day);
    // A bare "25 dec" typed in January means this year; typed in late December
    // it probably means next year. Rolling forward only once the date has
    // already passed matches intent far more often than it misses.
    if (!md.year && d.getTime() < now.getTime() - DAY_MS) d.setFullYear(year + 1);
    return at(d);
  }

  // Numeric: 25/12, 25-12-2026. Day-first, matching Indian and European usage.
  const numeric = lower.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/);
  if (numeric) {
    const day = Number(numeric[1]);
    const month = Number(numeric[2]) - 1;
    if (day >= 1 && day <= 31 && month >= 0 && month <= 11) {
      let year = numeric[3] ? Number(numeric[3]) : now.getFullYear();
      if (year < 100) year += 2000;
      const d = new Date(year, month, day);
      if (!numeric[3] && d.getTime() < now.getTime() - DAY_MS) d.setFullYear(year + 1);
      return at(d);
    }
  }

  return null;
}

function extractTime(lower: string): { h: number; m: number } | null {
  const m12 = lower.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/);
  if (m12) {
    const raw = Number(m12[1]);
    if (raw >= 1 && raw <= 12) {
      const h = (raw % 12) + (m12[3] === 'pm' ? 12 : 0);
      return { h, m: Number(m12[2] ?? 0) };
    }
  }
  const m24 = lower.match(/\b(\d{1,2}):(\d{2})\b/);
  if (m24) {
    const h = Number(m24[1]);
    const m = Number(m24[2]);
    if (h <= 23 && m <= 59) return { h, m };
  }
  return null;
}
