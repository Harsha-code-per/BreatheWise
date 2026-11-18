/**
 * The labelled inputs every setup section is built from. Each one owns its label markup and
 * hands back an already-typed value, so sections only describe which fact goes where.
 */
import { createContext, type ReactElement, type ReactNode, useContext } from 'react';
import { formatHour } from '../domain/time.js';
import { pickOption } from './options.js';
import styles from './setup.module.css';

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

/** Paths of the fields that failed the last submit; their inputs are marked invalid. */
export const InvalidFields = createContext<ReadonlySet<string>>(new Set());

/** The input id for a field path, so the error summary can link straight to it. */
export function fieldId(path: string): string {
  return `field-${path.replaceAll('.', '-')}`;
}

/** `aria-invalid` for a field path: present only while that field has an error. */
export function useInvalid(path: string): true | undefined {
  return useContext(InvalidFields).has(path) || undefined;
}

interface FieldProps<T> {
  label: string;
  value: T;
  onChange: (value: T) => void;
}

/**
 * A number input limited to one of the schema's ranges, with an optional hint below it.
 * `name` is the field's path in the profile, used for its id and error state.
 */
export function NumberField({
  name,
  label,
  value,
  onChange,
  range,
  step,
  hint,
}: FieldProps<number> & {
  name: string;
  range: { min: number; max: number };
  step?: number;
  hint?: { id: string; text: string };
}): ReactElement {
  const invalid = useInvalid(name);
  return (
    <label className="field">
      {label}
      <input
        id={fieldId(name)}
        type="number"
        min={range.min}
        max={range.max}
        step={step}
        value={value}
        aria-describedby={hint?.id}
        aria-invalid={invalid}
        onChange={(event) => {
          onChange(event.target.valueAsNumber);
        }}
      />
      {hint ? (
        <span id={hint.id} className="hint">
          {hint.text}
        </span>
      ) : null}
    </label>
  );
}

/** A select over a fixed list of options, shown by their human-readable names. */
export function SelectField<T extends string>({
  label,
  value,
  onChange,
  options,
  names,
}: FieldProps<T> & {
  options: readonly [T, ...T[]];
  names: Readonly<Record<T, string>>;
}): ReactElement {
  return (
    <label className="field">
      {label}
      <select
        value={value}
        onChange={(event) => {
          onChange(pickOption(options, event.target.value));
        }}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {names[option]}
          </option>
        ))}
      </select>
    </label>
  );
}

/** A select over the hours of the day, labelled in local clock time. */
export function HourField({ label, value, onChange }: FieldProps<number>): ReactElement {
  return (
    <label className="field">
      {label}
      <select
        value={value}
        onChange={(event) => {
          onChange(Number(event.target.value));
        }}
      >
        {HOURS.map((hour) => (
          <option key={hour} value={hour}>
            {formatHour(hour)}
          </option>
        ))}
      </select>
    </label>
  );
}

/** A checkbox with its label to the right. */
export function CheckField({
  label,
  value,
  onChange,
}: FieldProps<boolean> & { label: ReactNode }): ReactElement {
  return (
    <label className={styles['check']}>
      <input
        type="checkbox"
        checked={value}
        onChange={(event) => {
          onChange(event.target.checked);
        }}
      />
      {label}
    </label>
  );
}
