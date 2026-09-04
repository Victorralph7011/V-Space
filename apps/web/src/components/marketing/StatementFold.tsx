'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { MessageSquare } from 'lucide-react';

/**
 * A full-height breather between the hero and the concrete feature sections
 * below — one sentence, said plainly, with a decorative outlined numeral and
 * a floating badge that drifts and rotates gently as it scrolls past.
 */
export function StatementFold() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });

  const badgeY = useTransform(scrollYProgress, [0, 1], [80, -80]);
  const badgeRotate = useTransform(scrollYProgress, [0, 1], [-8, 8]);

  return (
    <section ref={ref} className="relative flex min-h-screen items-center overflow-hidden px-6 md:px-10">
      <span className="mkt-outline-text mkt-display pointer-events-none absolute -right-4 -top-10 select-none text-[38vw] leading-none sm:text-[26vw]">
        02
      </span>

      <div className="relative z-10 max-w-[22ch]">
        <p className="mkt-label mb-6 text-[10.5px] text-[var(--mkt-teal)]">The one idea</p>
        <p className="mkt-display text-[clamp(24px,3.6vw,52px)] leading-[1.15] text-[var(--mkt-ink)]">
          Everything you save is <span className="text-[var(--mkt-amber)]">one stream</span>, not five different boxes to remember to check.
        </p>
      </div>

      <motion.div
        className="pointer-events-none absolute right-[6%] top-1/2 hidden size-40 -translate-y-1/2 items-center justify-center rounded-full opacity-70 md:flex"
        style={{
          y: badgeY,
          rotate: badgeRotate,
          background: 'radial-gradient(circle at 30% 30%, var(--mkt-amber), var(--mkt-teal) 85%)',
        }}
      >
        <div className="flex size-32 items-center justify-center rounded-full bg-[var(--mkt-bg)]">
          <MessageSquare className="size-10 text-[var(--mkt-ink)]" strokeWidth={1.25} />
        </div>
      </motion.div>
    </section>
  );
}
