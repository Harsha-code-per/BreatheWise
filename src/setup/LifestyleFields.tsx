import type { ReactElement } from 'react';
import { COMMUTE_MODES, COOKING_FUELS, HEATING_TYPES, RANGES } from '../domain/schemas.js';
import type { Draft } from './draft.js';
import { CheckField, HourField, NumberField, SelectField } from './fields.js';
import { FUEL_NAMES, HEAT_NAMES, MODE_NAMES } from './labels.js';
import styles from './setup.module.css';

/** One section of the draft and a way to change part of it. */
interface SectionProps<T> {
  value: T;
  onChange: (patch: Partial<T>) => void;
}

function CommuteFields({ value, onChange }: SectionProps<Draft['commute']>): ReactElement {
  return (
    <fieldset className={styles['group']}>
      <legend>Your daily commute</legend>
      <div className={styles['grid']}>
        <SelectField
          label="How you travel"
          value={value.mode}
          options={COMMUTE_MODES}
          names={MODE_NAMES}
          onChange={(mode) => {
            onChange({ mode });
          }}
        />
        <NumberField
          name="commute.km"
          label="One-way distance (km)"
          value={value.km}
          range={RANGES.commuteKm}
          step={0.5}
          onChange={(km) => {
            onChange({ km });
          }}
        />
        <NumberField
          name="commute.daysPerWeek"
          label="Days a week"
          value={value.daysPerWeek}
          range={RANGES.commuteDays}
          onChange={(daysPerWeek) => {
            onChange({ daysPerWeek });
          }}
        />
        <HourField
          label="Usually leave at"
          value={value.departHour}
          onChange={(departHour) => {
            onChange({ departHour });
          }}
        />
      </div>
    </fieldset>
  );
}

function HomeFields({ value, onChange }: SectionProps<Draft['home']>): ReactElement {
  return (
    <fieldset className={styles['group']}>
      <legend>Your home</legend>
      <div className={styles['grid']}>
        <NumberField
          name="home.areaM2"
          label="Main room size (m²)"
          value={value.areaM2}
          range={RANGES.roomAreaM2}
          onChange={(areaM2) => {
            onChange({ areaM2 });
          }}
        />
        <NumberField
          name="home.purifierCadr"
          label="Purifier CADR (m³/h)"
          value={value.purifierCadr}
          range={RANGES.purifierCadr}
          hint={{ id: 'cadr-hint', text: 'On the box or label. Enter 0 if you have none.' }}
          onChange={(purifierCadr) => {
            onChange({ purifierCadr });
          }}
        />
        <SelectField
          label="Cooking fuel"
          value={value.cooking}
          options={COOKING_FUELS}
          names={FUEL_NAMES}
          onChange={(cooking) => {
            onChange({ cooking });
          }}
        />
        <SelectField
          label="Winter heating"
          value={value.heating}
          options={HEATING_TYPES}
          names={HEAT_NAMES}
          onChange={(heating) => {
            onChange({ heating });
          }}
        />
      </div>
    </fieldset>
  );
}

function ExerciseFields({ value, onChange }: SectionProps<Draft['exercise']>): ReactElement {
  return (
    <fieldset className={styles['group']}>
      <legend>Exercise</legend>
      <div className={styles['grid']}>
        <NumberField
          name="exercise.minutes"
          label="Minutes a day"
          value={value.minutes}
          range={RANGES.exerciseMinutes}
          onChange={(minutes) => {
            onChange({ minutes });
          }}
        />
        <CheckField
          label="Usually outdoors"
          value={value.outdoors}
          onChange={(outdoors) => {
            onChange({ outdoors });
          }}
        />
      </div>
    </fieldset>
  );
}

/** Commute, home and exercise: the lifestyle facts the plan is tailored to. */
export function LifestyleFields({
  draft,
  onChange,
}: {
  draft: Draft;
  onChange: (draft: Draft) => void;
}): ReactElement {
  const { commute, home, exercise } = draft;
  return (
    <>
      <CommuteFields
        value={commute}
        onChange={(patch) => {
          onChange({ ...draft, commute: { ...commute, ...patch } });
        }}
      />
      <HomeFields
        value={home}
        onChange={(patch) => {
          onChange({ ...draft, home: { ...home, ...patch } });
        }}
      />
      <ExerciseFields
        value={exercise}
        onChange={(patch) => {
          onChange({ ...draft, exercise: { ...exercise, ...patch } });
        }}
      />
    </>
  );
}
