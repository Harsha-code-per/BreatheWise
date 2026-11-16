/** @vitest-environment jsdom */
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

describe('entry point', () => {
  it('renders the app into #root', async () => {
    vi.resetModules();
    document.body.innerHTML = '<div id="root"></div>';
    await import('../../src/main');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Clear the air.' }),
    ).toBeInTheDocument();
  });

  it('does nothing when the page has no #root', async () => {
    vi.resetModules();
    document.body.innerHTML = '';
    await import('../../src/main');
    expect(document.body.childElementCount).toBe(0);
  });
});
