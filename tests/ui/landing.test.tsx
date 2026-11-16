/** @vitest-environment jsdom */
import { act, render, renderHook, screen } from '@testing-library/react';
import { useRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Landing } from '../../src/landing/Landing';
import { createSkyRenderer, MAX_PIXEL_RATIO } from '../../src/landing/sky-renderer';
import { SmogSky } from '../../src/landing/SmogSky';
import {
  CLARITY_EVENT,
  clarityAt,
  easeOut,
  INTRO_CLARITY,
  INTRO_MS,
  useClarity,
} from '../../src/landing/useClarity';
import { a11yViolations, mediaMatches } from './helpers';

/** A minimal WebGL context that records calls. */
function fakeGl(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    VERTEX_SHADER: 1,
    FRAGMENT_SHADER: 2,
    COMPILE_STATUS: 3,
    LINK_STATUS: 4,
    ARRAY_BUFFER: 5,
    STATIC_DRAW: 6,
    FLOAT: 7,
    TRIANGLES: 8,
    createShader: vi.fn(() => ({})),
    shaderSource: vi.fn(),
    compileShader: vi.fn(),
    getShaderParameter: vi.fn(() => true),
    createProgram: vi.fn(() => ({})),
    attachShader: vi.fn(),
    linkProgram: vi.fn(),
    getProgramParameter: vi.fn(() => true),
    useProgram: vi.fn(),
    bindBuffer: vi.fn(),
    createBuffer: vi.fn(),
    bufferData: vi.fn(),
    getAttribLocation: vi.fn(() => 0),
    enableVertexAttribArray: vi.fn(),
    vertexAttribPointer: vi.fn(),
    getUniformLocation: vi.fn(() => ({})),
    uniform1f: vi.fn(),
    uniform2f: vi.fn(),
    drawArrays: vi.fn(),
    viewport: vi.fn(),
    deleteProgram: vi.fn(),
    ...overrides,
  };
}

function canvasWith(gl: unknown): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.getContext = vi.fn(() => gl) as unknown as HTMLCanvasElement['getContext'];
  return canvas;
}

describe('createSkyRenderer', () => {
  it('draws frames, resizes at a capped pixel ratio and cleans up', () => {
    const gl = fakeGl();
    const canvas = canvasWith(gl);
    const renderer = createSkyRenderer(canvas);
    vi.stubGlobal('devicePixelRatio', 3);
    renderer?.resize(100, 50);
    expect(canvas.width).toBe(100 * MAX_PIXEL_RATIO);
    renderer?.draw({ time: 1, clarity: 0.5, night: true });
    renderer?.draw({ time: 1, clarity: 0.5, night: false });
    expect(gl.uniform1f).toHaveBeenCalledWith({}, 1);
    expect(gl.drawArrays).toHaveBeenCalledTimes(2);
    renderer?.dispose();
    expect(gl.deleteProgram).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it.each([
    ['no WebGL', null],
    ['no shader object', fakeGl({ createShader: vi.fn(() => null) })],
    ['a compile error', fakeGl({ getShaderParameter: vi.fn(() => false) })],
    ['a link error', fakeGl({ getProgramParameter: vi.fn(() => false) })],
  ])('returns null with %s', (_, gl) => {
    expect(createSkyRenderer(canvasWith(gl))).toBeNull();
  });
});

describe('clarity', () => {
  it('maps scroll progress and eases the entrance', () => {
    expect(clarityAt(-1)).toBe(INTRO_CLARITY);
    expect(clarityAt(2)).toBe(1);
    expect(easeOut(0)).toBe(0);
    expect(easeOut(5)).toBe(1);
  });

  describe('useClarity', () => {
    let frames: FrameRequestCallback[] = [];
    beforeEach(() => {
      frames = [];
      vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) =>
        frames.push(callback),
      );
      vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);
    });
    afterEach(() => {
      vi.stubGlobal('scrollY', 0);
      vi.unstubAllGlobals();
    });

    const flush = (time: number) => {
      const pending = frames;
      frames = [];
      pending.forEach((callback) => {
        callback(time);
      });
    };

    it('lifts the haze on load, then follows scrolling', () => {
      const root = document.createElement('div');
      vi.spyOn(performance, 'now').mockReturnValue(0);
      const { result, unmount } = renderHook(() => useClarity({ current: root }));
      act(() => {
        flush(INTRO_MS);
      });
      expect(result.current.current).toBeCloseTo(INTRO_CLARITY);
      vi.stubGlobal('scrollY', 10_000);
      window.dispatchEvent(new Event('scroll'));
      window.dispatchEvent(new Event('scroll'));
      act(() => {
        flush(INTRO_MS + 16);
      });
      expect(root.style.getPropertyValue('--clarity')).toBe('1.000');
      unmount();
    });

    it('skips the animation when motion is reduced, and does nothing without a root', () => {
      mediaMatches('(prefers-reduced-motion: reduce)');
      const root = document.createElement('div');
      const { result } = renderHook(() => useClarity({ current: root }));
      act(() => {
        flush(5);
      });
      expect(result.current.current).toBe(INTRO_CLARITY);
      expect(frames).toHaveLength(0);
      renderHook(() => useClarity({ current: null }));
    });
  });
});

describe('SmogSky', () => {
  it('falls back to a CSS sky without WebGL', () => {
    const { container } = render(<SmogSky clarity={{ current: 0 }} />);
    expect(container.firstElementChild).toHaveAttribute('data-fallback', 'true');
  });

  it('renders frames with WebGL, once per change when motion is reduced', () => {
    const gl = fakeGl();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      gl as unknown as RenderingContext,
    );
    mediaMatches('(prefers-reduced-motion: reduce)');
    const frames: FrameRequestCallback[] = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) =>
      frames.push(callback),
    );
    const clarity = { current: 0.3 };
    const { unmount } = render(<SmogSky clarity={clarity} />);
    expect(gl.drawArrays).toHaveBeenCalledTimes(1);
    expect(frames).toHaveLength(0);
    clarity.current = 0.4;
    window.dispatchEvent(new Event(CLARITY_EVENT));
    expect(gl.drawArrays).toHaveBeenCalledTimes(2);
    unmount();
    window.dispatchEvent(new Event(CLARITY_EVENT));
    expect(gl.drawArrays).toHaveBeenCalledTimes(2);
    expect(gl.deleteProgram).toHaveBeenCalled();
  });

  it('animates continuously when motion is allowed', () => {
    const gl = fakeGl();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      gl as unknown as RenderingContext,
    );
    const frames: FrameRequestCallback[] = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) =>
      frames.push(callback),
    );
    render(<SmogSky clarity={{ current: 0.3 }} />);
    frames.shift()?.(16);
    frames.shift()?.(32);
    expect(gl.drawArrays).toHaveBeenCalledTimes(2);
  });
});

describe('Landing', () => {
  function Harness() {
    const ref = useRef(null);
    return (
      <div ref={ref}>
        <Landing />
      </div>
    );
  }

  it('tells the story with accessible structure', async () => {
    const { container } = render(<Harness />);
    expect(screen.getByRole('heading', { level: 1, name: 'Clear the air.' })).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(5);
    expect(screen.getByText(/22 cigarettes/)).toBeInTheDocument();
    expect(await a11yViolations(container)).toEqual([]);
  });
});
