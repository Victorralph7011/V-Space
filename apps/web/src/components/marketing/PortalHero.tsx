'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Link2, Sparkles, Image as ImageIcon, Lightbulb, Bell } from 'lucide-react';

/**
 * The signature move of this page: a hero that opens like a physical portal.
 *
 * Mechanically this is one scroll-bound timeline, not a sequence of
 * triggered animations — every value below is `useTransform`'d directly off
 * `scrollYProgress`, so scrolling back up runs the whole thing in reverse for
 * free. The section is 2.5 viewports tall with a `sticky` stage inside it;
 * that extra height is what gives the timeline room to play out while the
 * hero stays pinned on screen.
 *
 * Three things happen in lockstep as the reader scrolls through the first
 * ~55% of that pinned duration:
 *   1. Two panels, meeting in the middle at rest, translate apart past the
 *      edge of the frame — the portal opening.
 *   2. The background art settles from a slight overscale to 1 and a duotone
 *      wash rises — the "photograph" arriving.
 *   3. The wordmark scales up *while* its tracking tightens *and* its two
 *      halves travel toward opposite edges. Doing the scale and the tracking
 *      change together is the entire point — either alone reads as a plain
 *      zoom or a plain letter-spacing tween; together it reads as a title
 *      physically opening.
 * Everything settles by 55% and holds, giving the reader a stable, fully
 * revealed hero for the remainder of the pin before normal scroll resumes.
 */
export function PortalHero() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });

  const OPEN_END = 0.55;
  // Named with a `use` prefix so the ESLint hooks rule recognises this as a
  // hook wrapper rather than flagging the `useTransform` call inside it.
  function useOpenTransform(from: number, to: number) {
    return useTransform(scrollYProgress, [0, OPEN_END], [from, to]);
  }

  const panelShift = useOpenTransform(0, 62); // vw — clears a panel slightly over half the frame
  const imageScale = useOpenTransform(1.18, 1);
  const duotoneOpacity = useOpenTransform(0, 0.32);
  const vignetteOpacity = useOpenTransform(0.75, 0.45);
  const dotSpread = useOpenTransform(0, 320); // px, toward each corner
  const dotOpacity = useTransform(scrollYProgress, [0, 0.15, OPEN_END, 1], [1, 1, 0, 0]);

  // Scale, tracking and split are all tuned so the FINAL, settled title
  // still fits inside the viewport — the opening motion has to read as a
  // title growing into its frame, not one that outgrows it and clips.
  const wordScale = useOpenTransform(1, 1.32);
  const wordTracking = useOpenTransform(-0.01, -0.06); // em
  const wordSplit = useOpenTransform(0, 16); // % of each span's own width

  return (
    <section ref={ref} className="relative h-[250vh]">
      <div className="sticky top-0 isolate h-screen overflow-hidden [contain:layout]">
        {/* Background art: an abstract stand-in for "hero photography" — a
            loose field of the five capture-kind glyphs, since a personal
            archive app has no tour photo to shoot. Its own warm/cool blend is
            what the duotone wash and dot accents are pulled from below. */}
        <motion.div className="absolute inset-0" style={{ scale: imageScale }}>
          <HeroArt />
        </motion.div>

        <motion.div
          className="absolute inset-0"
          style={{
            opacity: duotoneOpacity,
            background:
              'linear-gradient(135deg, var(--mkt-amber) 0%, transparent 45%, var(--mkt-teal) 100%)',
            mixBlendMode: 'overlay',
          }}
        />
        <motion.div
          className="absolute inset-0"
          style={{
            opacity: vignetteOpacity,
            background:
              'radial-gradient(ellipse at center, transparent 35%, var(--mkt-bg) 100%)',
          }}
        />

        {/* The two panels. At rest they meet exactly in the middle (each is
            just over half-width) so the hero begins fully closed. */}
        <motion.div
          className="absolute inset-y-0 left-0 w-[51%] bg-[var(--mkt-bg)]"
          style={{ x: useTransform(panelShift, (v) => `-${v}vw`) }}
        />
        <motion.div
          className="absolute inset-y-0 right-0 w-[51%] bg-[var(--mkt-bg)]"
          style={{ x: useTransform(panelShift, (v) => `${v}vw`) }}
        />

        {/* Two accent dots, travelling out toward opposite corners as the
            portal opens, then fading once the reveal is done. */}
        <motion.div
          className="absolute left-1/2 top-1/2 size-2.5 rounded-full bg-[var(--mkt-amber)] shadow-[0_0_24px_var(--mkt-amber)]"
          style={{ opacity: dotOpacity, x: useTransform(dotSpread, (v) => -v - 6), y: useTransform(dotSpread, (v) => -v * 0.6 - 6) }}
        />
        <motion.div
          className="absolute left-1/2 top-1/2 size-2.5 rounded-full bg-[var(--mkt-teal)] shadow-[0_0_24px_var(--mkt-teal)]"
          style={{ opacity: dotOpacity, x: useTransform(dotSpread, (v) => v - 6), y: useTransform(dotSpread, (v) => v * 0.6 - 6) }}
        />

        {/* The wordmark. */}
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <motion.h1
            className="mkt-display flex whitespace-nowrap text-[11vw] leading-none text-[var(--mkt-ink)] sm:text-[8vw]"
            style={{ scale: wordScale, letterSpacing: useTransform(wordTracking, (v) => `${v}em`) }}
          >
            <motion.span style={{ x: useTransform(wordSplit, (v) => `-${v}%`) }}>V-</motion.span>
            <motion.span style={{ x: useTransform(wordSplit, (v) => `${v}%`) }}>Space</motion.span>
          </motion.h1>
        </div>

        {/* Corner metadata, pinned to the frame edges. */}
        <div className="mkt-label pointer-events-none absolute inset-x-6 top-[74px] z-10 flex justify-between text-[10px] text-[var(--mkt-ink-2)] sm:inset-x-10">
          <span>Personal archive — est. now</span>
          <span>01 / capture</span>
        </div>
        <div className="mkt-label pointer-events-none absolute inset-x-6 bottom-8 z-10 flex justify-between text-[10px] text-[var(--mkt-ink-2)] sm:inset-x-10">
          <span>Paste anything. Find it again.</span>
          <span>Scroll</span>
        </div>
      </div>
    </section>
  );
}

const GLYPHS = [Link2, Sparkles, ImageIcon, Lightbulb, Bell];

/** A loose, deliberately irregular field of capture-kind glyphs standing in
 *  for hero photography — the thing the duotone wash and dots are "pulled
 *  from" is this composition's own warm-to-cool gradient ground. */
function HeroArt() {
  const cells = Array.from({ length: 48 }, (_, i) => i);
  return (
    <div
      className="size-full"
      style={{ background: 'linear-gradient(160deg, #201a14 0%, var(--mkt-bg) 45%, #0d1a1c 100%)' }}
    >
      <div className="grid size-full grid-cols-8 gap-px opacity-[0.14] sm:grid-cols-12">
        {cells.map((i) => {
          const Icon = GLYPHS[i % GLYPHS.length]!;
          const big = i % 7 === 0;
          return (
            <div key={i} className="flex items-center justify-center">
              <Icon
                className="text-[var(--mkt-ink)]"
                style={{ width: big ? 34 : 16, height: big ? 34 : 16 }}
                strokeWidth={1.25}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
