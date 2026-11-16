/**
 * Drives how clear the landing sky is. On load the smog lifts a little (the page's one
 * orchestrated entrance); after that, scrolling through the story clears it completely.
 * The value lives in a ref and a CSS variable, so scrolling never re-renders React.
 */
import { useEffect, useRef, type RefObject } from 'react';

/** Clarity reached by the entrance animation before any scrolling. */
export const INTRO_CLARITY = 0.2;
/** Fired on window whenever the clarity value changes, so a still sky can redraw on demand. */
export const CLARITY_EVENT = 'bw:clarity';

/** Length of the entrance animation, ms. */
export const INTRO_MS = 2400;

/** Clarity for a scroll progress (0–1) through the page. */
export function clarityAt(progress: number): number {
  const clamped = Math.min(1, Math.max(0, progress));
  return INTRO_CLARITY + (1 - INTRO_CLARITY) * clamped;
}

/** Eases the entrance so the haze starts lifting quickly and settles gently. */
export function easeOut(t: number): number {
  return 1 - (1 - Math.min(1, Math.max(0, t))) ** 3;
}

/** Tracks clarity for the element in `rootRef`, exposing it as `--clarity` on that element. */
export function useClarity(rootRef: RefObject<HTMLElement | null>): RefObject<number> {
  const clarity = useRef(0);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const started = performance.now();
    let frame = 0;

    const update = (now: number) => {
      const scrollable = Math.max(1, root.scrollHeight - window.innerHeight);
      const intro = calm ? INTRO_CLARITY : INTRO_CLARITY * easeOut((now - started) / INTRO_MS);
      const value = Math.max(
        intro,
        window.scrollY > 0 ? clarityAt(window.scrollY / scrollable) : 0,
      );
      clarity.current = value;
      root.style.setProperty('--clarity', value.toFixed(3));
      window.dispatchEvent(new Event(CLARITY_EVENT));
      frame = now - started < INTRO_MS && !calm ? requestAnimationFrame(update) : 0;
    };
    const onScroll = () => {
      if (frame === 0) frame = requestAnimationFrame(update);
    };

    frame = requestAnimationFrame(update);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
    };
  }, [rootRef]);

  return clarity;
}
