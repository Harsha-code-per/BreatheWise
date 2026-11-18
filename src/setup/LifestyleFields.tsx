import type { ReactElement } from 'react';
import { COMMUTE_MODES, COOKING_FUELS, HEATING_TYPES, RANGES } from '../domain/schemas.js';
import type { Draft } from './draft.js';
import { CheckField, HourField, NumberField, SelectField } from './fields.js';
import { FUEL_NAMES, HEAT_NAMES, MODE_NAMES } from './labels.js';
import styles from './setup.module.css';

interface Props {
  draft: Draft;
  onChange: (draft: Draft) => void;
}

/** Commute, home and exercise: the lifestyle facts the plan is tailored to. */
export function LifestyleFields({ draft, onChange }: Props): ReactElement {
  const { commute, home, exercise } = draft;
  const setCommute = (patch: Partial<Draft['commute']>) => {
    onChange({ ...draft, commute: { ...commute, ...patch } });
  };
  const setHome = (patch: Partial<Draft['home']>) => {
    onChange({ ...draft, home: { ...home, ...patch } });
  };
  const setExercise = (patch: Partial<Draft['exercise']>) => {
    onChange({ ...draft, exercise: { ...exercise, ...patch } });
  };

  return (
    <>
      <fieldset className={styles['group']}>
        <legend>Your daily commute</legend>
        <div className={styles['grid']}>
          <SelectField
            label="How you travel"
            value={commute.mode}
            options={COMMUTE_MODES}
            names={MODE_NAMES}
            onChange={(mode) => {
              setCommute({ mode });
            }}
          />
          <NumberField
            name="commute.km"
            label="One-way distance (km)"
            value={commute.km}
            range={RANGES.commuteKm}
            step={0.5}
            onChange={(km) => {
              setCommute({ km });
            }}
          />
          <NumberField
            name="commute.daysPerWeek"
            label="Days a week"
            value={commute.daysPerWeek}
            range={RANGES.commuteDays}
            onChange={(daysPerWeek) => {
              setCommute({ daysPerWeek });
            }}
          />
          <HourField
            label="Usually leave at"
            value={commute.departHour}
            onChange={(departHour) => {
              setCommute({ departHour });
            }}
          />
        </div>
      </fieldset>
      <fieldset className={styles['group']}>
        <legend>Your home</legend>
        <div className={styles['grid']}>
          <NumberField
            name="home.areaM2"
            label="Main room size (m²)"
            value={home.areaM2}
            range={RANGES.roomAreaM2}
            onChange={(areaM2) => {
              setHome({ areaM2 });
            }}
          />
          <NumberField
            name="home.purifierCadr"
            label="Purifier CADR (m³/h)"
            value={home.purifierCadr}
            range={RANGES.purifierCadr}
            hint={{ id: 'cadr-hint', text: 'On the box or label. Enter 0 if you have none.' }}
            onChange={(purifierCadr) => {
              setHome({ purifierCadr });
            }}
          />
          <SelectField
            label="Cooking fuel"
            value={home.cooking}
            options={COOKING_FUELS}
            names={FUEL_NAMES}
            onChange={(cooking) => {
              setHome({ cooking });
            }}
          />
          <SelectField
            label="Winter heating"
            value={home.heating}
            options={HEATING_TYPES}
            names={HEAT_NAMES}
            onChange={(heating) => {
              setHome({ heating });
            }}
          />
        </div>
      </fieldset>
      <fieldset className={styles['group']}>
        <legend>Exercise</legend>
        <div className={styles['grid']}>
          <NumberField
            name="exercise.minutes"
            label="Minutes a day"
            value={exercise.minutes}
            range={RANGES.exerciseMinutes}
            onChange={(minutes) => {
              setExercise({ minutes });
            }}
          />
          <CheckField
            label="Usually outdoors"
            value={exercise.outdoors}
            onChange={(outdoors) => {
              setExercise({ outdoors });
            }}
          />
        </div>
      </fieldset>
    </>
  );
}
