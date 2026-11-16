import { type ReactElement, useCallback, useMemo } from 'react';
import { allActions, analyse } from '../domain/analysis.js';
import { engineBriefing } from '../domain/briefing.js';
import { choiceImpact } from '../domain/choices.js';
import type { AirSnapshot, Profile } from '../domain/schemas.js';
import { api } from '../lib/api.js';
import { useRemote } from '../lib/useRemote.js';
import { ActionList } from './ActionList.js';
import { AskPanel } from './AskPanel.js';
import { BriefingCard } from './BriefingCard.js';
import styles from './dashboard.module.css';
import { HourlyChart } from './HourlyChart.js';
import { ImpactPanel } from './ImpactPanel.js';
import { Method } from './Method.js';
import { NowPanel } from './NowPanel.js';
import { SharePlan } from './SharePlan.js';
import { Tabs } from './Tabs.js';
import { useChoices } from './useChoices.js';

/** The assistant for a loaded forecast: engine results render at once, AI wording follows. */
function Insights({ profile, air }: { profile: Profile; air: AirSnapshot }): ReactElement {
  const analysis = useMemo(() => analyse(profile, air), [profile, air]);
  const loadPlan = useCallback(() => api.plan(profile), [profile]);
  const [plan, retryPlan] = useRemote(loadPlan);
  const choices = useChoices();
  const explanations = useMemo(
    () =>
      new Map(
        plan.status === 'ready'
          ? plan.data.briefing.explanations.map((item) => [item.id, item.why])
          : [],
      ),
    [plan],
  );
  const list = (actions: typeof analysis.routine, empty: string) => (
    <ActionList actions={actions} explanations={explanations} empty={empty} choices={choices} />
  );

  return (
    <div className={styles['insights']}>
      <div className={styles['side']}>
        <NowPanel analysis={analysis} />
        <ImpactPanel impact={choiceImpact(allActions(analysis), choices.chosen)} />
      </div>
      <BriefingCard plan={plan} fallback={engineBriefing(analysis)} onRetry={retryPlan} />
      <Tabs
        label="Your plan"
        tabs={[
          {
            id: 'today',
            label: 'Today',
            panel: (
              <>
                <HourlyChart hours={air.hours} now={air.now} />
                <h3 className={styles['planTitle']}>
                  {analysis.planIsTomorrow ? 'Tomorrow’s plan' : 'Today’s plan'}
                </h3>
                {list(analysis.routine, 'No timing changes needed.')}
              </>
            ),
          },
          {
            id: 'home',
            label: 'At home',
            panel: list(analysis.indoor, 'Your home is set up well.'),
          },
          {
            id: 'switches',
            label: 'Greener choices',
            panel: list(analysis.switches, 'Your travel is already low-carbon.'),
          },
          {
            id: 'community',
            label: 'Neighbours',
            panel: (
              <>
                {list(analysis.community, 'No community actions today.')}
                <SharePlan placeName={analysis.placeName} actions={analysis.community} />
              </>
            ),
          },
          { id: 'ask', label: 'Ask', panel: <AskPanel profile={profile} /> },
        ]}
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
