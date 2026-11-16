import type { ReactElement } from 'react';
import type { ChoiceImpact } from '../domain/choices.js';
import styles from './dashboard.module.css';

function plural(count: number, word: string): string {
  return `${String(count)} ${word}${count === 1 ? '' : 's'}`;
}

/** The combined effect of the steps the family has chosen, updated as they choose. */
export function ImpactPanel({ impact }: { impact: ChoiceImpact }): ReactElement {
  return (
    <section className={styles['impactPanel']} aria-labelledby="impact-title">
      <h2 id="impact-title">Your choices</h2>
      <p aria-live="polite">
        {impact.count === 0 ? (
          'Tap “I’ll do this” on any step to see what your choices change.'
        ) : (
          <>
            {plural(impact.count, 'step')} chosen.
            {impact.cigarettesWeek > 0 ? (
              <>
                {' '}
                Together they spare each of you smoke equal to{' '}
                <strong>{plural(impact.cigarettesWeek, 'cigarette')}</strong> a week.
              </>
            ) : null}
            {impact.co2KgWeek > 0 ? (
              <>
                {' '}
                They save <strong>{impact.co2KgWeek} kg of CO₂</strong> a week.
              </>
            ) : null}
          </>
        )}
      </p>
    </section>
  );
}
