import { type ReactElement, useCallback, useEffect, useState, type RefObject } from 'react';
import { MS_PER_SECOND } from '../domain/units.js';
import { useTheme } from '../ui/theme.js';
import styles from './landing.module.css';
import { createSkyRenderer, type SkyRenderer } from './sky-renderer.js';
import { CLARITY_EVENT } from './useClarity.js';

interface Sky {
  canvas: HTMLCanvasElement;
  renderer: SkyRenderer | null;
}

/** Keeps the drawing buffer the size of the canvas, and frees the GPU context on unmount. */
function useCanvasSize(sky: Sky | null): void {
  useEffect(() => {
    if (!sky?.renderer) return;
    const { canvas, renderer } = sky;
    const fit = () => {
      renderer.resize(canvas.clientWidth, canvas.clientHeight);
    };
    const observer = new ResizeObserver(fit);
    observer.observe(canvas);
    fit();
    return () => {
      observer.disconnect();
      renderer.dispose();
    };
  }, [sky]);
}

/** Redraws every frame, or, with reduced motion, only when scrolling changes the haze. */
function useSkyDrawing(sky: Sky | null, clarity: RefObject<number>, night: boolean): void {
  useEffect(() => {
    const renderer = sky?.renderer;
    if (!renderer) return;
    const draw = (time: number) => {
      renderer.draw({ time, clarity: clarity.current, night });
    };
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const redraw = () => {
        draw(0);
      };
      redraw();
      window.addEventListener(CLARITY_EVENT, redraw);
      return () => {
        window.removeEventListener(CLARITY_EVENT, redraw);
      };
    }
    let frame = requestAnimationFrame(function loop(now) {
      draw(now / MS_PER_SECOND);
      frame = requestAnimationFrame(loop);
    });
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [sky, clarity, night]);
}

/**
 * The animated sky behind the landing story. Decorative only, so it is hidden from
 * assistive technology; without WebGL a CSS gradient that also clears on scroll stands in.
 */
export function SmogSky({ clarity }: { clarity: RefObject<number> }): ReactElement {
  const night = useTheme() === 'dark';
  const [sky, setSky] = useState<Sky | null>(null);
  const attach = useCallback((canvas: HTMLCanvasElement | null) => {
    if (canvas) setSky({ canvas, renderer: createSkyRenderer(canvas) });
  }, []);
  useCanvasSize(sky);
  useSkyDrawing(sky, clarity, night);

  return (
    <div className={styles['sky']} data-fallback={sky !== null && sky.renderer === null}>
      <canvas ref={attach} className={styles['canvas']} aria-hidden="true" />
    </div>
  );
}
