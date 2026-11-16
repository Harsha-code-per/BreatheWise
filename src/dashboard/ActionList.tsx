import type { ReactElement } from 'react';
import type { Action } from '../domain/action.js';
import { impactLabels } from '../lib/format.js';
import styles from './dashboard.module.css';

/** AI-written explanations keyed by action id. */
type Explanations = ReadonlyMap<string, string>;

/** The actions to show, their AI wording, and the family's choices. */
interface Props {
  actions: readonly Action[];
  explanations: Explanations;
  empty: string;
  choices: { chosen: readonly string[]; toggle: (id: string) => void };
}

/** A list of recommendations, each with its time, effect and the reason it matters. */
export function ActionList({ actions, explanations, empty, choices }: Props): ReactElement {
  if (actions.length === 0) return <p className="hint">{empty}</p>;
  return (
    <ul className={styles['actions']}>
      {actions.map((action) => (
        <li key={action.id} className={styles['action']}>
          {action.when ? <time className={styles['when']}>{action.when}</time> : null}
          <div className={styles['actionBody']}>
            <h3 id={`title-${action.id}`}>{action.title}</h3>
            <p>{explanations.get(action.id) ?? action.detail}</p>
            <ul className={styles['effects']} aria-label="Effect">
              {impactLabels(action.impact).map((label) => (
                <li key={label.text} data-tone={label.tone}>
                  {label.text}
                </li>
              ))}
            </ul>
            <button
              type="button"
              className={styles['choose']}
              aria-pressed={choices.chosen.includes(action.id)}
              aria-describedby={`title-${action.id}`}
              onClick={() => {
                choices.toggle(action.id);
              }}
            >
              I’ll do this
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
