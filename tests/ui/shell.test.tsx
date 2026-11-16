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
      await screen.findByRole('heading', { name: 'Tell us about your family' }),
    ).toBeInTheDocument();
  });
});

describe('ThemeToggle', () => {
  it('starts from the system theme and remembers the choice', async () => {
    mediaMatches('(prefers-color-scheme: dark)');
    render(<ThemeToggle />);
    const toggle = screen.getByRole('button', { name: 'Dark mode' });
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(toggle);
    expect(document.documentElement.dataset['theme']).toBe('light');
    expect(localStorage.getItem('bw-theme')).toBe('light');
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
  });

  it('respects a theme already chosen', () => {
    document.documentElement.dataset['theme'] = 'light';
    render(<ThemeToggle />);
    expect(screen.getByRole('button', { name: 'Dark mode' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });
});
