import { type ReactElement, useCallback, useMemo } from 'react';
import { allActions, analyse } from '../domain/analysis.js';
import { engineBriefing } from '../domain/briefing.js';
import { choiceImpact } from '../domain/choices.js';
import type { AirSnapshot, Profile } from '../domain/schemas.js';
import { api } from '../lib/api.js';
import { useRemote } from '../lib/useRemote.js';
import { BriefingCard } from './BriefingCard.js';
import styles from './dashboard.module.css';
import { ImpactPanel } from './ImpactPanel.js';
import { Method } from './Method.js';
import { NowPanel } from './NowPanel.js';
import { PlanTabs } from './PlanTabs.js';
import { usePlan } from './usePlan.js';
import { useChoices } from './useChoices.js';

/** The assistant for a loaded forecast: engine results render at once, AI wording follows. */
function Insights({ profile, air }: { profile: Profile; air: AirSnapshot }): ReactElement {
  const analysis = useMemo(() => analyse(profile, air), [profile, air]);
  const { plan, retry: retryPlan, retryingSoon } = usePlan(profile);
  const choices = useChoices();
  const fallback = useMemo(() => engineBriefing(analysis), [analysis]);
  const explanations = useMemo(
    () =>
      new Map(
        plan.status === 'ready'
          ? plan.data.briefing.explanations.map((item) => [item.id, item.why])
          : [],
      ),
    [plan],
  );

  return (
    <div className={styles['insights']}>
      <div className={styles['side']}>
        <NowPanel analysis={analysis} />
        <ImpactPanel impact={choiceImpact(allActions(analysis), choices.chosen)} />
      </div>
      <BriefingCard
        plan={plan}
        fallback={fallback}
        onRetry={retryPlan}
        retryingSoon={retryingSoon}
        language={profile.language}
      />
      <PlanTabs
        profile={profile}
        air={air}
        analysis={analysis}
        explanations={explanations}
        choices={choices}
      />
      <Method />
    </div>
  );
}

/** Loads the forecast for the profile's place, with loading and retry states. */
export function AirView({ profile }: { profile: Profile }): ReactElement {
  const loadAir = useCallback(() => api.air(profile.place), [profile.place]);
  const [air, retry] = useRemote(loadAir);
  if (air.status === 'loading') {
    return (
      <p role="status" className={styles['state']}>
        Reading the forecast for {profile.place.name}…
      </p>
    );
  }
  if (air.status === 'error') {
    return (
      <div role="alert" className={styles['state']}>
        <p>{air.message}</p>
        <button type="button" className="button" onClick={retry}>
          Try again
        </button>
      </div>
    );
  }
  return <Insights profile={profile} air={air.data} />;
}
