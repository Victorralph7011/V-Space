'use client';

import { Link2, Sparkles, Image as ImageIcon, Lightbulb, Bell, type LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';

interface RosterRow {
  label: string;
  kinds: string;
  Icon: LucideIcon;
}

const ROWS: RosterRow[] = [
  { label: 'Links Space', kinds: 'reels · shorts · articles', Icon: Link2 },
  { label: 'Prompt Library', kinds: 'prompts · snippets', Icon: Sparkles },
  { label: 'Image Store', kinds: 'screenshots · photos', Icon: ImageIcon },
  { label: 'Innovative Ideas', kinds: 'startup thoughts', Icon: Lightbulb },
  { label: 'Daily Reminders', kinds: 'dates read from what you type', Icon: Bell },
];

/**
 * The catalogue roster, hairline-ruled — the same five destinations as the
 * deck above, restated as a plain list for a reader who scrolled past the
 * deck without dragging anything.
 */
export function SectionsRoster() {
  return (
    <section id="sections" className="border-t border-[var(--mkt-hairline)] px-6 py-24 md:px-10">
      <p className="mkt-label mb-10 text-[10.5px] text-[var(--mkt-teal)]">The five sections</p>
      <div>
        {ROWS.map((row, i) => (
          <motion.div
            key={row.label}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5, delay: i * 0.05 }}
            className="flex items-center justify-between gap-6 border-b border-[var(--mkt-hairline)] py-7"
          >
            <div className="flex items-center gap-5">
              <row.Icon className="size-5 shrink-0 text-[var(--mkt-ink-2)]" strokeWidth={1.5} />
              <span className="mkt-display text-[clamp(20px,3vw,36px)] text-[var(--mkt-ink)]">{row.label}</span>
            </div>
            <span className="hidden text-right text-[13px] text-[var(--mkt-muted)] sm:block">{row.kinds}</span>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
