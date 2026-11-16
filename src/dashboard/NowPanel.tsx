import type { ReactElement } from 'react';
import type { Analysis } from '../domain/analysis.js';
import { AQI_LEVELS, aqiBand } from '../domain/aqi.js';
import { shortDate } from '../lib/format.js';
import styles from './dashboard.module.css';

/** Highest AQI drawn on the scale; values above it pin to the end. */
const SCALE_MAX = 400;

/** The air right now: AQI on the EPA scale, what it means, and the next days. */
export function NowPanel({ analysis }: { analysis: Analysis }): ReactElement {
  const { current, band, smogNow, sensitiveNames } = analysis;
  const aqi = Math.round(current.aqi);
  const marker = `${String(Math.min(100, (aqi / SCALE_MAX) * 100))}%`;
  return (
    <section className={styles['now']} aria-labelledby="now-title" data-level={band.level}>
      <h2 id="now-title" className={styles['nowTitle']}>
        Air in {analysis.placeName} now
      </h2>
      <p className={styles['reading']}>
        <span className={styles['aqi']}>{aqi}</span>
        <span>
          <strong>{band.label}</strong>
          <span className="hint">
            {' '}
            on the US AQI, with PM2.5 at {Math.round(current.pm25)} µg/m³
          </span>
        </span>
      </p>
      <div
        className={styles['scale']}
        role="img"
        aria-label={`AQI ${String(aqi)} of 500: ${band.label}`}
      >
        {AQI_LEVELS.map((level) => (
          <span key={level} data-level={level} />
        ))}
        <span className={styles['marker']} style={{ insetInlineStart: marker }} />
      </div>
      <p>{band.guidance}</p>
      {smogNow ? (
        <p className={styles['alert']}>
          Smog is trapped near the ground: the air is not mixing, so pollution builds up until it
          lifts.
        </p>
      ) : null}
      {sensitiveNames.length > 0 ? (
        <p className="hint">Extra care today for {sensitiveNames.join(', ')}.</p>
      ) : null}
      <ul className={styles['outlook']} aria-label="Coming days">
        {analysis.outlook.map((day) => (
          <li key={day.date} data-level={day.level}>
            <span>{shortDate(day.date)}</span>
            <strong>{day.peakAqi}</strong>
            <span className="hint">{aqiBand(day.peakAqi).label}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
