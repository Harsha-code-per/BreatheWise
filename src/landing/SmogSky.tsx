import { type ReactElement, useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { useTheme } from '../ui/theme.js';
import styles from './landing.module.css';
import { createSkyRenderer, type SkyRenderer } from './sky-renderer.js';

/**
 * The animated sky behind the landing story. Decorative only, so it is hidden from
 * assistive technology; without WebGL a CSS gradient that also clears on scroll stands in.
 */
export function SmogSky({ clarity }: { clarity: RefObject<number> }): ReactElement {
  const night = useTheme() === 'dark';
  const nightRef = useRef(night);
  const [sky, setSky] = useState<{
    canvas: HTMLCanvasElement;
    renderer: SkyRenderer | null;
  } | null>(null);
  const attach = useCallback((canvas: HTMLCanvasElement | null) => {
    if (canvas) setSky({ canvas, renderer: createSkyRenderer(canvas) });
  }, []);

  useEffect(() => {
    nightRef.current = night;
  }, [night]);

  useEffect(() => {
    if (!sky?.renderer) return;
    const { canvas, renderer } = sky;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const fit = () => {
      renderer.resize(canvas.clientWidth, canvas.clientHeight);
    };
    const observer = new ResizeObserver(fit);
    observer.observe(canvas);
    fit();
    let frame = 0;
    let drawn = '';
    const loop = (now: number) => {
      const state = `${String(clarity.current)}|${String(nightRef.current)}`;
      if (!still || state !== drawn) {
        renderer.draw({
          time: still ? 0 : now / 1000,
          clarity: clarity.current,
          night: nightRef.current,
        });
        drawn = state;
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
