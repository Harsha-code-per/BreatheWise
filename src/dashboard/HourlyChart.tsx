import type { ReactElement } from 'react';
import { aqiBand } from '../domain/aqi.js';
import type { AirHour } from '../domain/schemas.js';
import { isTrapped } from '../domain/smog.js';
import { formatHour, hourOf } from '../domain/time.js';
import styles from './dashboard.module.css';

/** Even the cleanest hour keeps a visible sliver of bar. */
const MIN_BAR_PERCENT = 4;
/** Hours are labelled every six, which fits a phone-width chart. */
const LABEL_EVERY_HOURS = 6;

/** Hours shown in the strip. */
const HOURS_SHOWN = 24;

/** The next day's PM2.5 hour by hour, with inversion hours marked, plus the same data as a table. */
export function HourlyChart({
  hours,
  now,
}: {
  hours: readonly AirHour[];
  now: string;
}): ReactElement {
  const upcoming = hours.filter((hour) => hour.time >= now).slice(0, HOURS_SHOWN);
  const peak = Math.max(...upcoming.map((hour) => hour.pm25), 1);
  return (
    <figure className={styles['hourly']}>
      <figcaption>
        <h3>Next 24 hours</h3>
        <span className="hint">
          Bar height is PM2.5. Striped hours have smoke trapped under an inversion.
        </span>
      </figcaption>
      <ol className={styles['bars']} aria-hidden="true">
        {upcoming.map((hour) => (
          <li
            key={hour.time}
            data-level={aqiBand(hour.aqi).level}
            data-trapped={isTrapped(hour)}
            style={{ blockSize: `${String(Math.max(MIN_BAR_PERCENT, (hour.pm25 / peak) * 100))}%` }}
          >
            {hourOf(hour.time) % LABEL_EVERY_HOURS === 0 ? (
              <span>{formatHour(hourOf(hour.time))}</span>
            ) : null}
          </li>
        ))}
      </ol>
      <details>
        <summary>Show as a table</summary>
        <table className={styles['table']}>
          <thead>
            <tr>
              <th scope="col">Time</th>
              <th scope="col">PM2.5 (µg/m³)</th>
              <th scope="col">AQI</th>
              <th scope="col">Inversion</th>
            </tr>
          </thead>
          <tbody>
            {upcoming.map((hour) => (
              <tr key={hour.time}>
                <th scope="row">{formatHour(hourOf(hour.time))}</th>
                <td>{Math.round(hour.pm25)}</td>
                <td>{Math.round(hour.aqi)}</td>
                <td>{isTrapped(hour) ? 'Yes' : 'No'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
