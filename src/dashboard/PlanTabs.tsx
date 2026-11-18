import type { ReactElement } from 'react';
import type { Action } from '../domain/action.js';
import type { Analysis } from '../domain/analysis.js';
import type { AirSnapshot, Profile } from '../domain/schemas.js';
import { ActionList } from './ActionList.js';
import { AskPanel } from './AskPanel.js';
import styles from './dashboard.module.css';
import { HourlyChart } from './HourlyChart.js';
import { SharePlan } from './SharePlan.js';
import { Tabs } from './Tabs.js';
import type { Choices } from './useChoices.js';

interface Props {
  profile: Profile;
  air: AirSnapshot;
  analysis: Analysis;
  explanations: ReadonlyMap<string, string>;
  choices: Choices;
}

/** The plan split by where it happens: today's timing, home, greener travel, neighbours, and Ask. */
export function PlanTabs({ profile, air, analysis, explanations, choices }: Props): ReactElement {
  const list = (actions: readonly Action[], empty: string) => (
    <ActionList
      actions={actions}
      explanations={explanations}
      empty={empty}
      choices={choices}
      language={profile.language}
    />
  );

  return (
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
        { id: 'home', label: 'At home', panel: list(analysis.indoor, 'Your home is set up well.') },
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
  );
}
