import { type ReactElement, useEffect, useRef, useState, type SubmitEvent } from 'react';
import { LANGUAGES, type Intake, type Profile } from '../domain/schemas.js';
import { api } from '../lib/api.js';
import { applyIntake, checkDraft, newDraft, type Draft } from './draft.js';
import { IntakeField } from './IntakeField.js';
import { LANGUAGE_NAMES } from '../domain/names.js';
import { pickOption } from './options.js';
import { LifestyleFields } from './LifestyleFields.js';
import { MembersField } from './MembersField.js';
import { PlaceField } from './PlaceField.js';
import styles from './setup.module.css';

interface Props {
  initial: Profile | null;
  onSave: (profile: Profile) => void;
  onCancel?: () => void;
  onForget?: () => void;
}

/** Collects the family profile. Problems are listed in a summary that takes focus. */
export function SetupForm({ initial, onSave, onCancel, onForget }: Props): ReactElement {
  const [draft, setDraft] = useState<Draft>(initial ?? newDraft);
  const [errors, setErrors] = useState<string[]>([]);
  const summary = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (errors.length > 0) summary.current?.focus();
  }, [errors]);

  const readIntake = async (intake: Intake) => {
    setDraft((current) => applyIntake(current, intake));
    const [found] = intake.city ? await api.places(intake.city).catch(() => []) : [];
    if (found) setDraft((current) => ({ ...current, place: found }));
  };

  const submit = (event: SubmitEvent) => {
    event.preventDefault();
    const result = checkDraft(draft);
    if ('profile' in result) onSave(result.profile);
    else setErrors(result.errors);
  };

  return (
    <form className={styles['form']} onSubmit={submit} noValidate aria-labelledby="setup-title">
      <h1 id="setup-title">{initial ? 'Change your details' : 'Get your family’s smog plan'}</h1>
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
      <IntakeField onRead={readIntake} />
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
      <label className={['field', styles['narrow']].join(' ')}>
        Language for explanations
        <select
          value={draft.language}
          onChange={(event) => {
            setDraft({ ...draft, language: pickOption(LANGUAGES, event.target.value) });
          }}
        >
          {LANGUAGES.map((language) => (
            <option key={language} value={language}>
              {language === 'en'
                ? 'English'
                : `${LANGUAGE_NAMES[language].native} (${LANGUAGE_NAMES[language].english})`}
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
        {onForget ? (
          <button type="button" className="button button-quiet" onClick={onForget}>
            Forget my family
          </button>
        ) : null}
      </div>
    </form>
  );
}
