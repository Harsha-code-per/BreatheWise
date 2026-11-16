import { type ReactElement, useEffect, useRef, useState, type SubmitEvent } from 'react';
import { LANGUAGES, type Language, type Profile } from '../domain/schemas.js';
import { checkDraft, newDraft, type Draft } from './draft.js';
import { LANGUAGE_NAMES } from './labels.js';
import { LifestyleFields } from './LifestyleFields.js';
import { MembersField } from './MembersField.js';
import { PlaceField } from './PlaceField.js';
import styles from './setup.module.css';

interface Props {
  initial: Profile | null;
  onSave: (profile: Profile) => void;
  onCancel?: () => void;
}

/** Collects the family profile. Problems are listed in a summary that takes focus. */
export function SetupForm({ initial, onSave, onCancel }: Props): ReactElement {
  const [draft, setDraft] = useState<Draft>(initial ?? newDraft);
  const [errors, setErrors] = useState<string[]>([]);
  const summary = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (errors.length > 0) summary.current?.focus();
  }, [errors]);

  const submit = (event: SubmitEvent) => {
    event.preventDefault();
    const result = checkDraft(draft);
    if ('profile' in result) onSave(result.profile);
    else setErrors(result.errors);
  };

  return (
    <form className={styles['form']} onSubmit={submit} noValidate aria-labelledby="setup-title">
      <h1 id="setup-title">{initial ? 'Edit your family' : 'Tell us about your family'}</h1>
      <p className={styles['intro']}>
        Your answers are saved on this device only. To write your plan they are sent to our server
        and to Google Gemini, and neither keeps them.
      </p>
      {errors.length > 0 ? (
        <div
          ref={summary}
          tabIndex={-1}
          role="alert"
          className={styles['errors']}
          aria-labelledby="errors-title"
        >
          <h2 id="errors-title">
            Please fix {errors.length === 1 ? 'one thing' : `${String(errors.length)} things`}
          </h2>
          <ul>
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <PlaceField
        place={draft.place}
        onChange={(place) => {
          setDraft({ ...draft, place });
        }}
      />
      <MembersField
        members={draft.members}
        onChange={(members) => {
          setDraft({ ...draft, members });
        }}
      />
      <LifestyleFields draft={draft} onChange={setDraft} />
      <label className={`field ${styles['narrow'] ?? ''}`}>
        Language for explanations
        <select
          value={draft.language}
          onChange={(event) => {
            setDraft({ ...draft, language: event.target.value as Language });
          }}
        >
          {LANGUAGES.map((language) => (
            <option key={language} value={language}>
              {LANGUAGE_NAMES[language]}
            </option>
          ))}
        </select>
      </label>
      <div className={styles['actions']}>
        <button type="submit" className="button">
          Show my plan
        </button>
        {onCancel ? (
          <button type="button" className="button button-quiet" onClick={onCancel}>
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  );
}
