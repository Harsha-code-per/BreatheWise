import { type ReactElement, useCallback, useEffect, useState, type RefObject } from 'react';
import styles from './landing.module.css';
import { createSkyRenderer, type SkyRenderer } from './sky-renderer.js';

/** True when the page is showing its dark theme, by choice or by system setting. */
export function prefersNight(): boolean {
  const chosen = document.documentElement.dataset['theme'];
  return chosen ? chosen === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * The animated sky behind the landing story. Decorative only, so it is hidden from
 * assistive technology; without WebGL a CSS gradient that also clears on scroll stands in.
 */
export function SmogSky({ clarity }: { clarity: RefObject<number> }): ReactElement {
  const [sky, setSky] = useState<{
    canvas: HTMLCanvasElement;
    renderer: SkyRenderer | null;
  } | null>(null);
  const attach = useCallback((canvas: HTMLCanvasElement | null) => {
    if (canvas) setSky({ canvas, renderer: createSkyRenderer(canvas) });
  }, []);

  useEffect(() => {
    if (!sky?.renderer) return;
    const { canvas, renderer } = sky;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const night = prefersNight();
    const fit = () => {
      renderer.resize(canvas.clientWidth, canvas.clientHeight);
    };
    const observer = new ResizeObserver(fit);
    observer.observe(canvas);
    fit();
    let frame = 0;
    let drawn = -1;
    const loop = (now: number) => {
      if (!still || clarity.current !== drawn) {
        renderer.draw({ time: still ? 0 : now / 1000, clarity: clarity.current, night });
        drawn = clarity.current;
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      renderer.dispose();
    };
  }, [sky, clarity]);

  return (
    <div className={styles['sky']} data-fallback={sky !== null && sky.renderer === null}>
      <canvas ref={attach} className={styles['canvas']} aria-hidden="true" />
    </div>
  );
}
