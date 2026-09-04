'use client';

import { motion } from 'framer-motion';

const STEPS = [
  {
    n: '01',
    title: 'Paste anything',
    body: 'A link, a prompt, a screenshot, a deadline — one chat box takes it all, no menu to pick first.',
  },
  {
    n: '02',
    title: 'It reads itself',
    body: 'A local classifier files it instantly, offline. Ralph fills in a real description a moment later.',
  },
  {
    n: '03',
    title: 'Find it again',
    body: 'Search runs on-device against everything you’ve ever saved — no network round trip, no waiting.',
  },
] as const;

/**
 * Replaces the record-label reference spec's tour-dates table — a schedule
 * has no equivalent in a personal archive. A three-step "how it works" strip
 * keeps the same hairline-ruled rhythm as the roster above it while actually
 * saying something true about the product.
 */
export function HowItWorks() {
  return (
    <section id="how" className="border-t border-[var(--mkt-hairline)] px-6 py-24 md:px-10">
      <p className="mkt-label mb-10 text-[10.5px] text-[var(--mkt-amber)]">How it works</p>
      <div className="grid gap-x-8 gap-y-12 md:grid-cols-3">
        {STEPS.map((step, i) => (
          <motion.div
            key={step.n}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5, delay: i * 0.08 }}
          >
            <span className="mkt-display block text-[13px] text-[var(--mkt-muted)]">{step.n}</span>
            <h3 className="mkt-display mt-3 text-[22px] text-[var(--mkt-ink)]">{step.title}</h3>
            <p className="mt-3 max-w-[36ch] text-[14px] leading-relaxed text-[var(--mkt-ink-2)]">{step.body}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
