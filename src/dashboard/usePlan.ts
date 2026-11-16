/**
 * Loads the family's AI briefing. When Gemini was busy and the engine had to write it, the
 * briefing is requested once more after the server's cooldown has passed, so most families
 * see Gemini's version without doing anything.
 */
import { useCallback, useEffect, useState } from 'react';
import type { PlanResponse, Profile } from '../domain/schemas.js';
import { api } from '../lib/api.js';
import { useRemote, type Remote } from '../lib/useRemote.js';

/** Long enough for a busy model's cooldown on the server to expire. */
export const AUTO_RETRY_MS = 12_000;

/** The briefing, a manual retry, and whether an automatic retry is about to happen. */
export interface PlanState {
  plan: Remote<PlanResponse>;
  retry: () => void;
  retryingSoon: boolean;
}

/** Requests the briefing and retries once, automatically, if Gemini was busy. */
export function usePlan(profile: Profile): PlanState {
  const load = useCallback(() => api.plan(profile), [profile]);
  const [plan, retry] = useRemote(load);
  const [autoRetried, setAutoRetried] = useState(false);
  const retryingSoon = plan.status === 'ready' && plan.data.source === 'engine' && !autoRetried;

  useEffect(() => {
    if (!retryingSoon) return;
    const timer = setTimeout(() => {
      setAutoRetried(true);
      retry();
    }, AUTO_RETRY_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [retryingSoon, retry]);

  return { plan, retry, retryingSoon };
}
