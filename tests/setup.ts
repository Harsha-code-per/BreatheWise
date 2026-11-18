import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';
import { z } from 'zod';

z.config({ jitless: true });

// The default 1 s wait for async UI is too tight when the whole suite runs in parallel under coverage.
configure({ asyncUtilTimeout: 3000 });

// Tests never call real AI providers, whatever the developer's environment holds.
for (const key of ['GEMINI_API_KEY', 'FALLBACK_AI_URL', 'FALLBACK_AI_KEY', 'FALLBACK_AI_MODEL']) {
  Reflect.deleteProperty(process.env, key);
}

/** jsdom lacks these browser APIs; fresh stubs per test keep overrides from leaking. */
function installBrowserStubs(): void {
  window.matchMedia = vi.fn((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
  window.scrollTo = vi.fn();
  globalThis.ResizeObserver = class {
    observe = vi.fn();
    disconnect = vi.fn();
    unobserve = vi.fn();
  };
  HTMLCanvasElement.prototype.getContext = vi.fn(() => null);
}

beforeEach(() => {
  if (typeof window !== 'undefined') installBrowserStubs();
});

afterEach(() => {
  cleanup();
  if (typeof window !== 'undefined') {
    localStorage.clear();
    delete document.documentElement.dataset['theme'];
    window.history.replaceState(null, '', '/');
  }
});
