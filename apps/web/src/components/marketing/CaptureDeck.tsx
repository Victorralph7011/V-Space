'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useAnimation, type LegacyAnimationControls } from 'framer-motion';
import { Link2, Sparkles, Image as ImageIcon, Lightbulb, Bell, type LucideIcon } from 'lucide-react';
import Link from 'next/link';

interface DeckCard {
  label: string;
  copy: string;
  Icon: LucideIcon;
}

const CARDS: DeckCard[] = [
  { label: 'Links Space', copy: 'A reel, a short, a doc — filed with a real description, not just a URL.', Icon: Link2 },
  { label: 'Prompt Library', copy: 'Everything you’d otherwise paste into a dozen different chats.', Icon: Sparkles },
  { label: 'Image Store', copy: 'Screenshots that used to vanish into a camera roll you never scroll.', Icon: ImageIcon },
  { label: 'Innovative Ideas', copy: 'The startup thought you’d lose by the time you found a notes app.', Icon: Lightbulb },
  { label: 'Daily Reminders', copy: '"Submit assignment friday 6pm" — the date gets read out of the sentence.', Icon: Bell },
];

const THROW_THRESHOLD = 0.28; // fraction of deck width
const FLING_MS = 320; // must match the fling transition's own duration below

/** The resting transform for a card at a given depth in the stack — 0 is on top. */
function restingTarget(stackPos: number, index: number) {
  return {
    x: 0,
    y: stackPos * 14,
    scale: 1 - stackPos * 0.045,
    rotate: stackPos === 0 ? 0 : (index % 2 === 0 ? 1 : -1) * stackPos * 2.5,
    opacity: 1,
    transition: { type: 'spring' as const, stiffness: 300, damping: 28 },
  };
}

/**
 * The catalogue as a deck you flip through by hand, not a list you scroll.
 *
 * `order` holds the current stacking arrangement as indices into `CARDS` —
 * `order[0]` is the card on top. Every card's animation is driven
 * imperatively through its own `useAnimation` controls rather than a
 * declarative `animate` prop, because the same card needs two different
 * animation sources at different times (a physics-y resting transform after
 * every reorder, and a one-off fling on release) and mixing those through
 * one prop is what produces visible snapping. `useEffect` re-applies the
 * resting transform whenever a card's depth changes; `throwTop` briefly
 * overrides it with the fling, then lets the effect resettle the deck once
 * the reorder lands.
 */
export function CaptureDeck() {
  const [order, setOrder] = useState(() => CARDS.map((_, i) => i));
  const deckRef = useRef<HTMLDivElement>(null);
  const isThrowingRef = useRef(false);

  // One fixed set of controls per card — created once, reused across
  // reorders, since the card identity (not its stack position) owns them.
  const controlsA = useAnimation();
  const controlsB = useAnimation();
  const controlsC = useAnimation();
  const controlsD = useAnimation();
  const controlsE = useAnimation();
  const controls: LegacyAnimationControls[] = [controlsA, controlsB, controlsC, controlsD, controlsE];

  useEffect(() => {
    order.forEach((cardIndex, stackPos) => {
      void controls[cardIndex]!.start(restingTarget(stackPos, cardIndex));
    });
    // controls' identity is stable across renders (useAnimation returns the
    // same object), so only `order` actually needs to be a dependency here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order]);

  function throwTop(direction: 1 | -1) {
    // `order` only updates once the fling finishes (below), so a second
    // throw fired before then — holding the arrow key, or a fast repeated
    // press — would otherwise read the same stale `order[0]` and fling the
    // very same card twice. One throw in flight at a time; the rest are
    // dropped rather than raced, same as you can't flick the next card
    // before the last one has left your hand.
    //
    // The reset is a plain `setTimeout` matched to the fling's own
    // duration, not a `.then()` on the animation promise: this same
    // controls instance also receives a resting-position `.start()` call
    // from the `[order]` effect on mount, and a second `.start()` racing
    // the first is enough for Framer Motion to leave the earlier promise
    // permanently unresolved — which would leave `isThrowingRef` stuck
    // `true` forever. A timer has no such dependency on promise semantics.
    if (isThrowingRef.current) return;
    isThrowingRef.current = true;

    const topIndex = order[0]!;
    const width = deckRef.current?.offsetWidth ?? 320;

    void controls[topIndex]!.start({
      x: direction * width * 1.3,
      rotate: direction * 22,
      opacity: 0.3,
      transition: { duration: FLING_MS / 1000, ease: 'easeIn' },
    });

    setTimeout(() => {
      setOrder((prev) => [...prev.slice(1), prev[0]!]);
      isThrowingRef.current = false;
    }, FLING_MS);
  }

  function handleDragEnd(index: number, offsetX: number, velocityX: number) {
    const width = deckRef.current?.offsetWidth ?? 320;
    const passedThreshold = Math.abs(offsetX) > width * THROW_THRESHOLD || Math.abs(velocityX) > 800;

    if (passedThreshold && index === order[0]) {
      throwTop(offsetX > 0 ? 1 : -1);
    } else {
      void controls[index]!.start(restingTarget(order.indexOf(index), index));
    }
  }

  return (
    <section id="capture" className="grid gap-14 px-6 py-28 md:grid-cols-2 md:items-center md:px-10 md:py-40">
      <div>
        <p className="mkt-label mb-5 text-[10.5px] text-[var(--mkt-amber)]">What it does</p>
        <h2 className="mkt-display mb-6 text-[clamp(26px,3.2vw,44px)] leading-[1.1] text-[var(--mkt-ink)]">
          Paste anything. It gets filed and described automatically.
        </h2>
        <p className="mb-9 max-w-[46ch] text-[15px] leading-relaxed text-[var(--mkt-ink-2)]">
          One chat box, five destinations. A link, a prompt, a screenshot, an idea, a
          deadline — each one lands in the right place with a description written
          for you, searchable the moment it arrives.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/auth/signup"
            className="mkt-label rounded-full bg-[var(--mkt-ink)] px-6 py-3 text-[11px] text-[var(--mkt-bg)] transition-opacity hover:opacity-85"
          >
            Create your space
          </Link>
          <Link
            href="/auth/login"
            className="mkt-label rounded-full border border-[var(--mkt-hairline)] px-6 py-3 text-[11px] text-[var(--mkt-ink)] transition-colors hover:border-[var(--mkt-ink-2)]"
          >
            Sign in
          </Link>
        </div>
      </div>

      <div>
        <div
          ref={deckRef}
          tabIndex={0}
          role="group"
          aria-label="Section preview deck — use arrow keys to cycle"
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight') throwTop(1);
            if (e.key === 'ArrowLeft') throwTop(-1);
          }}
          className="relative mx-auto aspect-square w-full max-w-[380px] outline-none focus-visible:ring-2 focus-visible:ring-[var(--mkt-amber)]"
        >
          {CARDS.map((card, index) => {
            const isTop = order[0] === index;
            return (
              <motion.div
                key={card.label}
                animate={controls[index]}
                initial={restingTarget(order.indexOf(index), index)}
                drag={isTop ? 'x' : false}
                dragElastic={0.5}
                dragMomentum={false}
                onDragEnd={(_, info) => handleDragEnd(index, info.offset.x, info.velocity.x)}
                style={{ zIndex: CARDS.length - order.indexOf(index), touchAction: 'pan-y' }}
                className="absolute inset-0 flex cursor-grab flex-col justify-between rounded-[28px] border border-[var(--mkt-hairline)] bg-[var(--mkt-bg-2)] p-8 active:cursor-grabbing"
              >
                <card.Icon className="size-9 text-[var(--mkt-ink)]" strokeWidth={1.25} />
                <div>
                  <h3 className="mkt-display mb-2 text-[19px] text-[var(--mkt-ink)]">{card.label}</h3>
                  <p className="text-[13px] leading-snug text-[var(--mkt-ink-2)]">{card.copy}</p>
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="mt-6 flex items-center justify-center gap-2">
          {CARDS.map((card, index) => (
            <span
              key={card.label}
              className="size-1.5 rounded-full transition-colors"
              style={{ background: order[0] === index ? 'var(--mkt-amber)' : 'var(--mkt-hairline)' }}
            />
          ))}
        </div>
        <p className="mkt-label mt-4 text-center text-[10px] text-[var(--mkt-muted)]">
          Drag, or use the arrow keys
        </p>
      </div>
    </section>
  );
}
