import type { ReactElement } from 'react';
import type { Action } from '../domain/action.js';
import { impactLabels } from '../lib/format.js';
import styles from './dashboard.module.css';

/** AI-written explanations keyed by action id. */
export type Explanations = ReadonlyMap<string, string>;

/** A list of recommendations, each with its time, effect and the reason it matters. */
export function ActionList({
  actions,
  explanations,
  empty,
}: {
  actions: readonly Action[];
  explanations: Explanations;
  empty: string;
}): ReactElement {
  if (actions.length === 0) return <p className="hint">{empty}</p>;
  return (
    <ul className={styles['actions']}>
      {actions.map((action) => (
        <li key={action.id} className={styles['action']}>
          {action.when ? <time className={styles['when']}>{action.when}</time> : null}
          <div className={styles['actionBody']}>
            <h3>{action.title}</h3>
            <p>{explanations.get(action.id) ?? action.detail}</p>
            <ul className={styles['effects']} aria-label="Effect">
              {impactLabels(action.impact).map((label) => (
                <li key={label.text} data-tone={label.tone}>
                  {label.text}
                </li>
              ))}
            </ul>
          </div>
        </li>
      ))}
    </ul>
  );
}
