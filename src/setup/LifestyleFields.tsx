import type { ReactElement } from 'react';
import { COMMUTE_MODES, COOKING_FUELS, HEATING_TYPES } from '../domain/schemas.js';
import { formatHour } from '../domain/time.js';
import type { Draft } from './draft.js';
import { FUEL_NAMES, HEAT_NAMES, MODE_NAMES } from './labels.js';
import { pickOption } from './options.js';
import styles from './setup.module.css';

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

interface Props {
  draft: Draft;
  onChange: (draft: Draft) => void;
}

function Options<T extends string>({
  values,
  names,
}: {
  values: readonly T[];
  names: Readonly<Record<T, string>>;
}) {
  return values.map((value) => (
    <option key={value} value={value}>
      {names[value]}
    </option>
  ));
}

function HourOptions() {
  return HOURS.map((hour) => (
    <option key={hour} value={hour}>
      {formatHour(hour)}
    </option>
  ));
}

/** Commute, home and exercise: the lifestyle facts the plan is tailored to. */
export function LifestyleFields({ draft, onChange }: Props): ReactElement {
  const commute = (patch: Partial<Draft['commute']>) => {
    onChange({ ...draft, commute: { ...draft.commute, ...patch } });
  };
  const home = (patch: Partial<Draft['home']>) => {
    onChange({ ...draft, home: { ...draft.home, ...patch } });
  };
  return (
    <>
      <fieldset className={styles['group']}>
        <legend>Your daily commute</legend>
        <div className={styles['grid']}>
          <label className="field">
            How you travel
            <select
              value={draft.commute.mode}
              onChange={(event) => {
                commute({ mode: pickOption(COMMUTE_MODES, event.target.value) });
              }}
            >
              <Options values={COMMUTE_MODES} names={MODE_NAMES} />
            </select>
          </label>
          <label className="field">
            One-way distance (km)
            <input
              type="number"
              min={0}
              max={200}
              step={0.5}
              value={draft.commute.km}
              onChange={(event) => {
                commute({ km: event.target.valueAsNumber });
              }}
            />
          </label>
          <label className="field">
            Days a week
            <input
              type="number"
              min={0}
              max={7}
              value={draft.commute.daysPerWeek}
              onChange={(event) => {
                commute({ daysPerWeek: event.target.valueAsNumber });
              }}
            />
          </label>
          <label className="field">
            Usually leave at
            <select
              value={draft.commute.departHour}
              onChange={(event) => {
                commute({ departHour: Number(event.target.value) });
              }}
            >
              <HourOptions />
            </select>
          </label>
        </div>
      </fieldset>
      <fieldset className={styles['group']}>
        <legend>Your home</legend>
        <div className={styles['grid']}>
          <label className="field">
            Main room size (m²)
            <input
              type="number"
              min={5}
              max={500}
              value={draft.home.areaM2}
              onChange={(event) => {
                home({ areaM2: event.target.valueAsNumber });
              }}
            />
          </label>
          <label className="field">
            Purifier CADR (m³/h)
            <input
              type="number"
              min={0}
              max={3000}
              value={draft.home.purifierCadr}
              aria-describedby="cadr-hint"
              onChange={(event) => {
                home({ purifierCadr: event.target.valueAsNumber });
              }}
            />
            <span id="cadr-hint" className="hint">
              On the box or label. Enter 0 if you have none.
            </span>
          </label>
          <label className="field">
            Cooking fuel
            <select
              value={draft.home.cooking}
              onChange={(event) => {
                home({ cooking: pickOption(COOKING_FUELS, event.target.value) });
              }}
            >
              <Options values={COOKING_FUELS} names={FUEL_NAMES} />
            </select>
          </label>
          <label className="field">
            Winter heating
            <select
              value={draft.home.heating}
              onChange={(event) => {
                home({ heating: pickOption(HEATING_TYPES, event.target.value) });
              }}
            >
              <Options values={HEATING_TYPES} names={HEAT_NAMES} />
            </select>
          </label>
        </div>
      </fieldset>
      <fieldset className={styles['group']}>
        <legend>Exercise</legend>
        <div className={styles['grid']}>
          <label className="field">
            Minutes a day
            <input
              type="number"
              min={0}
              max={240}
              value={draft.exercise.minutes}
              onChange={(event) => {
                onChange({
                  ...draft,
                  exercise: { ...draft.exercise, minutes: event.target.valueAsNumber },
                });
              }}
            />
          </label>
          <label className={styles['check']}>
            <input
              type="checkbox"
              checked={draft.exercise.outdoors}
              onChange={(event) => {
                onChange({
                  ...draft,
                  exercise: { ...draft.exercise, outdoors: event.target.checked },
                });
              }}
            />
            Usually outdoors
          </label>
        </div>
      </fieldset>
    </>
  );
}
