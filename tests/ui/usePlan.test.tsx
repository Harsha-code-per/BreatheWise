/** @vitest-environment jsdom */
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AUTO_RETRY_MS, usePlan } from '../../src/dashboard/usePlan';
import { makeProfile } from '../fixtures';
import { mockApi } from './helpers';

const engine = {
  source: 'engine',
  briefing: { headline: 'Engine', summary: 'Engine text.', explanations: [] },
};
const ai = {
  source: 'ai',
  briefing: { headline: 'Gemini', summary: 'Gemini text.', explanations: [] },
};
const profile = makeProfile();

describe('usePlan', () => {
  it('asks Gemini once more after a busy reply, then stops', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const plan = vi
      .fn()
      .mockReturnValueOnce(Response.json(engine))
      .mockReturnValue(Response.json(engine));
    mockApi({ plan });
    const { result } = renderHook(() => usePlan(profile));
    await waitFor(() => {
      expect(result.current.retryingSoon).toBe(true);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(AUTO_RETRY_MS);
    });
    await waitFor(() => {
      expect(plan).toHaveBeenCalledTimes(2);
      expect(result.current.plan.status).toBe('ready');
    });
    expect(result.current.retryingSoon).toBe(false);
    vi.useRealTimers();
  });

  it('does not retry an AI briefing, and cancels a pending retry on unmount', async () => {
    mockApi({ plan: () => Response.json(ai) });
    const first = renderHook(() => usePlan(profile));
    await waitFor(() => {
      expect(first.result.current.plan.status).toBe('ready');
    });
    expect(first.result.current.retryingSoon).toBe(false);
    mockApi({ plan: () => Response.json(engine) });
    const second = renderHook(() => usePlan(profile));
    await waitFor(() => {
      expect(second.result.current.retryingSoon).toBe(true);
    });
    second.unmount();
  });
});
