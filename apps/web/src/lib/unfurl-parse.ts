/**
 * Pure HTML-prefix parsing for `unfurl.ts`, split out specifically so it can
 * be unit tested without a network call or the `server-only` guard — this
 * file has no dependency on `fetch`, streams, or Next.js at all.
 */

export interface UnfurlResult {
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  siteName: string | null;
}

export const EMPTY_UNFURL: UnfurlResult = {
  title: null,
  description: null,
  imageUrl: null,
  siteName: null,
};

export function parseUnfurl(html: string, sourceUrl: string): UnfurlResult {
  return {
    title: metaContent(html, 'og:title') ?? tagText(html, 'title'),
    description: metaContent(html, 'og:description') ?? metaContent(html, 'description'),
    imageUrl: resolveUrl(metaContent(html, 'og:image'), sourceUrl),
    siteName: metaContent(html, 'og:site_name'),
  };
}

export function metaContent(html: string, key: string): string | null {
  // Matches both attribute orderings — `property` then `content`, or the
  // reverse — since real-world pages are inconsistent about it.
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${escapeRegex(key)}["'][^>]+content=["']([^"']*)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${escapeRegex(key)}["']`, 'i'),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return decodeEntities(match[1]).trim();
  }
  return null;
}

export function tagText(html: string, tag: string): string | null {
  const match = html.match(new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, 'i'));
  return match?.[1] ? decodeEntities(match[1]).trim() : null;
}

export function resolveUrl(value: string | null, base: string): string | null {
  if (!value) return null;
  try {
    return new URL(value, base).toString();
  } catch {
    return null;
  }
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", '#39': "'", nbsp: ' ',
};

export function decodeEntities(text: string): string {
  return text.replace(/&(#\d+|#x[0-9a-f]+|[a-z]+);/gi, (whole, code: string) => {
    if (code[0] === '#') {
      const codePoint = code[1]?.toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : whole;
    }
    return ENTITIES[code.toLowerCase()] ?? whole;
  });
}
