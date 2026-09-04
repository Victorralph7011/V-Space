/**
 * Seeds a target account with ~200 realistic items across every non-secret
 * kind, so search and list performance get tested against something closer
 * to real usage than a handful of hand-typed rows — the corpus size the
 * plan's verification section calls for.
 *
 * `secret` items are deliberately not generated here: they'd need a vault
 * passphrase and a configured `CryptoProvider`, neither of which exists in a
 * bare Node script, and seeding fake plaintext "secrets" that were never
 * actually encrypted would be worse than not testing that kind at all. The
 * vault has its own dedicated test suite
 * (`packages/core/src/crypto/vault.test.ts`) for that.
 *
 * Uses `firebase-admin` directly (the same service account as
 * `apps/web/src/lib/firebase-admin.ts`) rather than the client SDK, because a
 * seed script has no user to sign in as — the whole point is writing into an
 * account without needing its password, which only an admin credential can do.
 *
 * Usage:
 *   FIREBASE_SERVICE_ACCOUNT_BASE64=... node --experimental-strip-types --no-warnings scripts/seed.ts <uid>
 *   npm run seed -- <uid>
 */
import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { storedTokens } from '../packages/core/src/search/tokenize.ts';
import type {
  Item,
  ItemKind,
  ItemSource,
  ItemStatus,
} from '../packages/core/src/types/index.ts';

const uid = process.argv[2];
if (!uid) {
  console.error('Usage: node --experimental-strip-types scripts/seed.ts <uid>');
  console.error('Find a uid in Firebase Console → Authentication → Users.');
  process.exit(1);
}

const encoded = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
if (!encoded) {
  console.error('FIREBASE_SERVICE_ACCOUNT_BASE64 is not set — see apps/web/.env.example.');
  process.exit(1);
}

const serviceAccount = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

// ─────────────────────────────────────────────────────────────────────────────
// Sample content, grouped by kind. Real-shaped rather than "test item 47" —
// realistic titles are what actually exercises the search ranking (title
// matches, tag matches, fuzzy typos) in a way lorem ipsum can't.
// ─────────────────────────────────────────────────────────────────────────────

interface SeedTemplate {
  kind: ItemKind;
  source: ItemSource;
  title: string;
  body: string;
  description: string;
  tags: string[];
  url?: string;
  dueInDays?: number;
}

const LINKS: SeedTemplate[] = [
  {
    kind: 'link', source: 'instagram',
    title: 'Prompt chaining explained in 60 seconds',
    body: '', url: 'https://www.instagram.com/reel/DcMYJ2QBjF_/',
    description: 'A quick walkthrough of chaining prompts across multiple model calls to break a hard task into steps.',
    tags: ['prompts', 'ai', 'reels'],
  },
  {
    kind: 'link', source: 'youtube',
    title: 'Building a RAG pipeline from scratch',
    body: '', url: 'https://youtube.com/watch?v=abc123',
    description: 'End-to-end walkthrough of chunking, embedding, and retrieval for a document Q&A system.',
    tags: ['rag', 'embeddings', 'tutorial'],
  },
  {
    kind: 'link', source: 'youtube',
    title: 'System design: designing a URL shortener',
    body: '', url: 'https://youtube.com/shorts/xyz789',
    description: 'Short covering hashing strategy, database schema, and read/write scaling for a URL shortener.',
    tags: ['system-design', 'interview'],
  },
  {
    kind: 'link', source: 'github',
    title: 'vercel/next.js',
    body: '', url: 'https://github.com/vercel/next.js',
    description: 'The React framework this app\'s web client is built on — App Router, Server Components, Turbopack.',
    tags: ['nextjs', 'framework'],
  },
  {
    kind: 'link', source: 'leetcode',
    title: 'Two Sum',
    body: '', url: 'https://leetcode.com/problems/two-sum/',
    description: 'Classic hashmap problem — O(n) single pass storing complements.',
    tags: ['dsa', 'arrays'],
  },
  {
    kind: 'link', source: 'leetcode',
    title: 'Longest Substring Without Repeating Characters',
    body: '', url: 'https://leetcode.com/problems/longest-substring-without-repeating-characters/',
    description: 'Sliding window with a set tracking the current window\'s characters.',
    tags: ['dsa', 'sliding-window'],
  },
  {
    kind: 'link', source: 'instagram',
    title: 'Minimalist UI breakdown — onboarding flow',
    body: '', url: 'https://www.instagram.com/reel/DcElx3fuTTf/',
    description: 'Three-screen onboarding using a single recurring shape motif for visual continuity.',
    tags: ['ui', 'design', 'reels'],
  },
  {
    kind: 'link', source: 'web',
    title: 'The bitter lesson',
    body: '', url: 'https://www.incompleteideas.net/IncIdeas/BitterLesson.html',
    description: 'Rich Sutton\'s essay on why general methods leveraging computation win out over hand-crafted ones.',
    tags: ['ml', 'essay'],
  },
  {
    kind: 'link', source: 'reddit',
    title: 'What\'s your Firestore security rules testing setup?',
    body: '', url: 'https://reddit.com/r/Firebase/comments/xyz',
    description: 'Thread comparing the emulator suite against manual console testing for rules coverage.',
    tags: ['firebase', 'testing'],
  },
  {
    kind: 'link', source: 'youtube',
    title: 'Tailwind v4: what actually changed',
    body: '', url: 'https://youtube.com/watch?v=tw4changes',
    description: 'CSS-first config, the @theme block, and the new cascade-layer-based utility generation.',
    tags: ['tailwind', 'css'],
  },
];

const PROMPTS: SeedTemplate[] = [
  {
    kind: 'prompt', source: 'manual',
    title: 'Senior engineer system prompt',
    body: 'Act like a senior full-stack engineer building a production-ready app from scratch. First design the complete system architecture, then build the most minimal but scalable version possible. Include system architecture, file structure, database schema, API endpoints, UI architecture, and production-ready code.',
    description: 'Full-stack build prompt — architecture first, then a minimal scalable implementation.',
    tags: ['prompts', 'engineering'],
  },
  {
    kind: 'prompt', source: 'manual',
    title: 'Code reviewer persona',
    body: 'You are a senior code reviewer. Review the following diff for correctness bugs, security issues, and simplification opportunities. Be specific: cite file and line. Do not comment on style unless it affects correctness.',
    description: 'Focused code-review prompt — correctness and security only, no style nitpicking.',
    tags: ['prompts', 'code-review'],
  },
  {
    kind: 'prompt', source: 'manual',
    title: 'Explain like I\'m a junior dev',
    body: 'Explain the following concept as if teaching a junior developer with 6 months of experience. Use a concrete example, avoid jargon, and end with one common mistake beginners make with this concept.',
    description: 'Teaching-style explainer prompt for concepts, aimed at junior-level clarity.',
    tags: ['prompts', 'learning'],
  },
  {
    kind: 'prompt', source: 'manual',
    title: 'SQL query optimizer',
    body: 'You are a database performance expert. Given a slow SQL query and its EXPLAIN output, identify the bottleneck and propose an index or rewrite. Always explain the tradeoff of any suggested index.',
    description: 'Query-optimization prompt that requires EXPLAIN output and explains index tradeoffs.',
    tags: ['prompts', 'sql', 'performance'],
  },
  {
    kind: 'prompt', source: 'manual',
    title: 'Resume bullet rewriter',
    body: 'Rewrite the following resume bullet to lead with impact (a number or outcome), use a strong action verb, and stay under 20 words. Do not invent metrics that weren\'t provided.',
    description: 'Resume-bullet rewriting prompt — impact-first, no fabricated numbers.',
    tags: ['prompts', 'career'],
  },
];

const IDEAS: SeedTemplate[] = [
  {
    kind: 'idea', source: 'manual',
    title: 'V-Space',
    body: 'An app that turns the "message myself on WhatsApp" habit into a real searchable library — reels, prompts, code, ideas, and reminders, auto-described by AI and findable again.',
    description: 'The idea behind this very app — a structured personal archive replacing a self-chat.',
    tags: ['startup', 'productivity'],
  },
  {
    kind: 'idea', source: 'manual',
    title: 'Split-bill app for hostel roommates',
    body: 'What if there was a dead-simple expense splitter for hostel roommates — groceries, wifi, cleaning — that settles up automatically at month end via UPI deep links, no manual reminders.',
    description: 'Automated hostel expense-splitting concept using UPI deep links for settlement.',
    tags: ['startup', 'fintech'],
  },
  {
    kind: 'idea', source: 'manual',
    title: 'Local-first note app with no login screen',
    body: 'A notes app that works fully offline from the first launch, no account required, and syncs only if you explicitly opt in later by scanning a QR code on a second device.',
    description: 'Zero-friction local-first notes concept with opt-in device-pairing sync.',
    tags: ['startup', 'privacy'],
  },
  {
    kind: 'idea', source: 'manual',
    title: 'Browser extension that summarizes your open tabs into one page',
    body: 'For research binges — one click turns 20 open tabs into a single readable digest with links back to each source, so you can close everything without losing the thread.',
    description: 'Tab-digest extension idea for research sessions with many open tabs.',
    tags: ['startup', 'browser-extension'],
  },
];

const NOTES: SeedTemplate[] = [
  {
    kind: 'note', source: 'manual',
    title: 'Wifi router admin login',
    body: 'Router admin page is at 192.168.1.1, default login is on the sticker under the router, not the one in the manual.',
    description: '',
    tags: ['home'],
  },
  {
    kind: 'note', source: 'manual',
    title: 'Landlord\'s alternate number',
    body: 'If the usual number doesn\'t pick up, try the shop landline during the day — he\'s usually there 10am-8pm.',
    description: '',
    tags: ['home'],
  },
  {
    kind: 'note', source: 'manual',
    title: 'Gym locker combination pattern',
    body: 'Locker combos reset every semester — check the notice board near reception, not the app, the app is always outdated.',
    description: '',
    tags: [],
  },
];

const CODE: SeedTemplate[] = [
  {
    kind: 'code', source: 'manual',
    title: 'Debounce hook',
    body: 'function useDebounce(value, delayMs) {\n  const [debounced, setDebounced] = useState(value);\n  useEffect(() => {\n    const t = setTimeout(() => setDebounced(value), delayMs);\n    return () => clearTimeout(t);\n  }, [value, delayMs]);\n  return debounced;\n}',
    description: 'A small reusable debounce hook for search inputs.',
    tags: ['react', 'snippets'],
  },
  {
    kind: 'code', source: 'leetcode',
    title: 'Two Sum — hashmap solution',
    body: 'function twoSum(nums, target) {\n  const seen = new Map();\n  for (let i = 0; i < nums.length; i++) {\n    const need = target - nums[i];\n    if (seen.has(need)) return [seen.get(need), i];\n    seen.set(nums[i], i);\n  }\n}',
    description: 'O(n) single-pass solution using a hashmap of seen complements.',
    tags: ['dsa', 'javascript'],
  },
  {
    kind: 'code', source: 'manual',
    title: 'Postgres index for a common filter+sort',
    body: 'CREATE INDEX idx_orders_status_created\n  ON orders (status, created_at DESC)\n  WHERE status != \'archived\';',
    description: 'Partial composite index matching a status filter plus a created_at sort.',
    tags: ['sql', 'postgres'],
  },
];

const REMINDERS: SeedTemplate[] = [
  { kind: 'reminder', source: 'manual', title: 'Submit DBMS assignment', body: 'DBMS assignment 3 — normalization exercises', description: '', tags: ['college'], dueInDays: 2 },
  { kind: 'reminder', source: 'manual', title: 'Pay hostel mess fee', body: 'Mess fee due before the 5th or a late fee applies', description: '', tags: ['money'], dueInDays: -1 },
  { kind: 'reminder', source: 'manual', title: 'Mock interview with Aditya', body: 'System design mock — prep the URL shortener answer', description: '', tags: ['interview'], dueInDays: 5 },
  { kind: 'reminder', source: 'manual', title: 'Renew library book', body: '', description: '', tags: [], dueInDays: -4 },
  { kind: 'reminder', source: 'manual', title: 'Project demo — final year project', body: 'Have the deployed link and the slides ready beforehand', description: '', tags: ['college'], dueInDays: 12 },
];

const ALL_TEMPLATES = [...LINKS, ...PROMPTS, ...IDEAS, ...NOTES, ...CODE, ...REMINDERS];

// ─────────────────────────────────────────────────────────────────────────────

const TARGET_COUNT = 200;
const BATCH_LIMIT = 400; // Firestore's actual cap is 500; leave headroom.

function randomPastDate(maxDaysAgo: number): Date {
  const daysAgo = Math.floor(Math.random() * maxDaysAgo);
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60), 0, 0);
  return d;
}

function buildItem(template: SeedTemplate, index: number): Omit<Item, 'id'> {
  const createdAt = randomPastDate(180).toISOString();
  const pinned = Math.random() < 0.08;
  const status: ItemStatus =
    template.kind === 'reminder' && template.dueInDays !== undefined && template.dueInDays < -2
      ? Math.random() < 0.5 ? 'done' : 'active'
      : Math.random() < 0.03
        ? 'archived'
        : 'active';

  const dueAt =
    template.dueInDays !== undefined
      ? (() => {
          const d = new Date();
          d.setDate(d.getDate() + template.dueInDays!);
          d.setHours(9 + (index % 10), 0, 0, 0);
          return d.toISOString();
        })()
      : null;

  const base: Omit<Item, 'id' | 'searchTokens'> = {
    kind: template.kind,
    title: index < ALL_TEMPLATES.length ? template.title : `${template.title} (${Math.floor(index / ALL_TEMPLATES.length) + 1})`,
    body: template.body,
    url: template.url ?? null,
    media: null,
    description: template.description,
    tags: template.tags,
    source: template.source,
    meta: {},
    dueAt,
    status,
    pinned,
    encrypted: false,
    enrichment: template.description
      ? { state: 'done', model: 'seed', at: createdAt }
      : { state: 'idle' },
    createdAt,
    updatedAt: createdAt,
  };

  return { ...base, searchTokens: storedTokens(base) };
}

async function seed(): Promise<void> {
  const items: Omit<Item, 'id'>[] = [];
  for (let i = 0; i < TARGET_COUNT; i++) {
    items.push(buildItem(ALL_TEMPLATES[i % ALL_TEMPLATES.length]!, i));
  }

  const itemsCol = db.collection('users').doc(uid!).collection('items');
  let written = 0;

  for (let offset = 0; offset < items.length; offset += BATCH_LIMIT) {
    const batch = db.batch();
    for (const item of items.slice(offset, offset + BATCH_LIMIT)) {
      batch.set(itemsCol.doc(), item);
      written++;
    }
    await batch.commit();
    console.log(`  wrote ${written}/${items.length}`);
  }

  console.log(`\nSeeded ${written} items for uid ${uid}.`);
}

seed().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
