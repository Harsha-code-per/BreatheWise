/** @vitest-environment jsdom */
import { act, render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { App } from '../../src/app/App';
import { navigate, routeOf, useRoute } from '../../src/app/navigation';
import { ThemeToggle } from '../../src/ui/ThemeToggle';
import { mediaMatches, mockApi } from './helpers';

describe('navigation', () => {
  it('maps paths to pages', () => {
    expect(routeOf('/')).toBe('home');
    expect(routeOf('/app')).toBe('app');
  });

  it('updates subscribers on navigate and on back/forward', () => {
    const { result } = renderHook(() => useRoute());
    act(() => {
      navigate('app');
    });
    expect(result.current).toBe('app');
    act(() => {
      window.history.pushState(null, '', '/');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(result.current).toBe('home');
  });

  it('animates with a view transition unless motion is reduced', () => {
    const transition = vi.fn((change: () => void) => {
      change();
    });
    Object.assign(document, { startViewTransition: transition });
    navigate('app');
    expect(transition).toHaveBeenCalledTimes(1);
    mediaMatches('(prefers-reduced-motion: reduce)');
    navigate('home');
    expect(transition).toHaveBeenCalledTimes(1);
    expect(window.location.pathname).toBe('/');
    Reflect.deleteProperty(document, 'startViewTransition');
  });
});

describe('App', () => {
  it('shows the landing page at / and the assistant at /app', async () => {
    mockApi();
    render(<App />);
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Clear the air.' }),
    ).toBeInTheDocument();
    await userEvent.click(screen.getAllByRole('link', { name: 'Check my air' })[0]!);
    expect(
      await screen.findByRole('heading', { name: 'Get your family’s smog plan' }),
    ).toBeInTheDocument();
  });
});

describe('ThemeToggle', () => {
  it('starts from the system theme, switches and remembers the choice', async () => {
    mediaMatches('(prefers-color-scheme: dark)');
    render(<ThemeToggle />);
    await userEvent.click(screen.getByRole('button', { name: 'Switch to light theme' }));
    expect(document.documentElement.dataset['theme']).toBe('light');
    expect(localStorage.getItem('bw-theme')).toBe('light');
    await userEvent.click(screen.getByRole('button', { name: 'Switch to dark theme' }));
    expect(document.documentElement.dataset['theme']).toBe('dark');
  });

  it('respects a theme already chosen and survives blocked storage', async () => {
    document.documentElement.dataset['theme'] = 'light';
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    render(<ThemeToggle />);
    await userEvent.click(screen.getByRole('button', { name: 'Switch to dark theme' }));
    expect(screen.getByRole('button', { name: 'Switch to light theme' })).toBeInTheDocument();
  });

  it('follows system theme changes', () => {
    let listener: () => void = () => undefined;
    vi.spyOn(window, 'matchMedia').mockImplementation(
      (query: string) =>
        ({
          matches: false,
          media: query,
          addEventListener: (_: string, callback: () => void) => {
            listener = callback;
          },
          removeEventListener: vi.fn(),
        }) as unknown as MediaQueryList,
    );
    const { unmount } = render(<ThemeToggle />);
    expect(screen.getByRole('button', { name: 'Switch to dark theme' })).toBeInTheDocument();
    act(() => {
      document.documentElement.dataset['theme'] = 'dark';
      listener();
    });
    expect(screen.getByRole('button', { name: 'Switch to light theme' })).toBeInTheDocument();
    unmount();
  });
});
