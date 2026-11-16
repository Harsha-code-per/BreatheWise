import type { ReactElement } from 'react';
import { SOURCES } from '../domain/sources.js';
import styles from './dashboard.module.css';

/** "How we calculate": the model behind every number, with its sources. */
export function Method(): ReactElement {
  return (
    <details className={styles['method']}>
      <summary>How we calculate</summary>
      <p>
        Smoke breathed is concentration × time × breathing rate. Indoor air uses a one-room mass
        balance with your floor area and purifier. Exposure is compared with doing the same thing at
        the day’s worst time. Gemini only explains these results; any reply that contains a number
        we did not calculate is discarded.
      </p>
      <ul>
        {SOURCES.map((source) => (
          <li key={source.id}>
            {source.usedFor}:{' '}
            <a href={source.url} target="_blank" rel="noreferrer">
              {source.citation}
            </a>
          </li>
        ))}
      </ul>
    </details>
  );
}
