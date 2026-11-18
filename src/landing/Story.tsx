import type { ReactElement, ReactNode } from 'react';
import styles from './landing.module.css';

/** Example hourly PM2.5 (µg/m³) for a winter smog day in Delhi, midnight to midnight. */
const EXAMPLE_DAY = [
  168, 172, 175, 178, 180, 176, 170, 158, 140, 118, 96, 74, 58, 48, 44, 46, 55, 72, 98, 126, 148,
  160, 165, 168,
];
const CHART = { width: 480, height: 200, max: 200 };
/** Shaded stretches of the example day, in hours from midnight. */
const BANDS = [
  { from: 0, hours: 9.5, kind: 'trapped' },
  { from: 18, hours: 5, kind: 'trapped' },
  { from: 13, hours: 2, kind: 'cleanest' },
] as const;

function pointsFor(values: readonly number[]): string {
  const step = CHART.width / (values.length - 1);
  return values
    .map(
      (value, hour) =>
        `${String(hour * step)},${String(CHART.height - (value / CHART.max) * CHART.height)}`,
    )
    .join(' ');
}

function DayChart() {
  const step = CHART.width / (EXAMPLE_DAY.length - 1);
  return (
    <figure className={styles['visual']}>
      <svg
        viewBox={`0 0 ${String(CHART.width)} ${String(CHART.height + 24)}`}
        aria-hidden="true"
        className={styles['chart']}
      >
        {BANDS.map((band) => (
          <rect
            key={band.from}
            x={step * band.from}
            y="0"
            width={step * band.hours}
            height={CHART.height}
            className={styles[band.kind]}
          />
        ))}
        <polyline points={pointsFor(EXAMPLE_DAY)} className={styles['line']} />
        <text x="0" y={CHART.height + 20}>
          midnight
        </text>
        <text x={CHART.width / 2} y={CHART.height + 20} textAnchor="middle">
          noon
        </text>
        <text x={CHART.width} y={CHART.height + 20} textAnchor="end">
          midnight
        </text>
      </svg>
      <figcaption className="hint">
        PM2.5 across a smog day in Delhi. Shaded hours: smoke trapped near the ground. Highlighted:
        the cleanest stretch, 13:00 to 15:00, at about a quarter of the night-time level.
      </figcaption>
    </figure>
  );
}

function DayPlan() {
  return (
    <figure className={styles['visual']}>
      <ol className={styles['plan']}>
        <li>
          <time>09:00</time> Leave for work an hour later <span>33% less smoke on the way</span>
        </li>
        <li>
          <time>12:00</time> Run in the cleanest hour <span>78% less smoke breathed</span>
        </li>
        <li>
          <time>17:00</time> Keep Mira and Nani indoors until 20:00{' '}
          <span>the dirtiest three hours</span>
        </li>
      </ol>
      <figcaption className="hint">An example plan for a family of four on a smog day.</figcaption>
    </figure>
  );
}

function RoomBars() {
  return (
    <figure className={styles['visual']}>
      <dl className={styles['bars']}>
        <div>
          <dt>Windows shut, no filter</dt>
          <dd>
            <span className={styles['bar']} data-level="high" /> 79 µg/m³
          </dd>
        </div>
        <div>
          <dt>Box fan with four filters taped on</dt>
          <dd>
            <span className={styles['bar']} data-level="low" /> 3 µg/m³
          </dd>
        </div>
      </dl>
      <figcaption className="hint">
        Indoor PM2.5 in a 20 m² room on the same day, from an indoor air model.
      </figcaption>
    </figure>
  );
}

/** One scroll beat: a heading, its copy and an optional visual, inside the glass pane. */
function Beat({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section className={styles['beat']} aria-labelledby={id}>
      <div className={styles['pane']}>
        <h2 id={id}>{title}</h2>
        {children}
      </div>
    </section>
  );
}

/** The four-part scroll story told while the smog lifts. */
export function Story(): ReactElement {
  return (
    <>
      <Beat id="beat-timetable" title="Smog keeps a timetable.">
        <p>
          On still winter nights the air stops mixing and smoke settles over the city. By early
          afternoon it lifts. BreatheWise reads the hourly forecast, and the height of that lid, for
          wherever you live.
        </p>
        <DayChart />
      </Beat>
      <Beat id="beat-day" title="Move the day, not the city.">
        <p>
          Shift the workout, the commute and the school run into the clean hours. Same day, a
          fraction of the smoke.
        </p>
        <DayPlan />
      </Beat>
      <Beat id="beat-room" title="Clean the room you sleep in.">
        <p>
          Families spend most of a smog day indoors. A purifier sized for the room, or a box fan
          with filters taped to it, does more than any houseplant.
        </p>
        <RoomBars />
      </Beat>
      <Beat id="beat-impact" title="See what every choice changes.">
        <p className={styles['impact']}>
          One week of that plan spares each of you smoke equal to <strong>22 cigarettes</strong>.
          Cycling the 8 km to work instead of driving saves <strong>13 kg of CO₂</strong>.
        </p>
        <p className="hint">Every number shows its formula and source in the app.</p>
      </Beat>
    </>
  );
}
