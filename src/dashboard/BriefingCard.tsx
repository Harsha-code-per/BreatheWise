import type { ReactElement } from 'react';
import type { Briefing, PlanResponse } from '../domain/schemas.js';
import type { Remote } from '../lib/useRemote.js';
import styles from './dashboard.module.css';

/**
 * Today's briefing. The engine's version shows immediately; Gemini's personalised version
 * replaces it when it arrives, and the label always says who wrote it.
 */
export function BriefingCard({
  plan,
  fallback,
  onRetry,
  retryingSoon,
}: {
  plan: Remote<PlanResponse>;
  fallback: Briefing;
  onRetry: () => void;
  retryingSoon: boolean;
}): ReactElement {
  const fromAi = plan.status === 'ready' && plan.data.source === 'ai';
  const briefing = plan.status === 'ready' ? plan.data.briefing : fallback;
  return (
    <section
      className={styles['briefing']}
      aria-labelledby="briefing-title"
      aria-busy={plan.status === 'loading'}
    >
      <h2 id="briefing-title">{briefing.headline}</h2>
      <p>{briefing.summary}</p>
      <p className="hint" role="status">
        {authorNote(plan.status === 'loading', fromAi)}
        {retryingSoon ? ' Asking Gemini again in a few seconds.' : ''}
      </p>
      {plan.status !== 'loading' && !fromAi ? (
        <p>
          <button type="button" className="button button-quiet" onClick={onRetry}>
            Ask Gemini again
          </button>
        </p>
      ) : null}
    </section>
  );
}

function authorNote(loading: boolean, fromAi: boolean): string {
  if (loading) return 'Gemini is personalising this for your family…';
  return fromAi
    ? 'Written by Gemini from your forecast. Every number comes from BreatheWise’s calculations.'
    : 'Written by BreatheWise from your forecast, because Gemini is busy on its free tier right now.';
}
