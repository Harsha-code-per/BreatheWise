import type { ReactElement } from 'react';
import { LANGUAGES, type Profile } from '../domain/schemas.js';
import { ErrorSummary } from './ErrorSummary.js';
import { InvalidFields, SelectField } from './fields.js';
import { IntakeField } from './IntakeField.js';
import { LANGUAGE_LABELS } from './labels.js';
import { LifestyleFields } from './LifestyleFields.js';
import { MembersField } from './MembersField.js';
import { PlaceField } from './PlaceField.js';
import styles from './setup.module.css';
import { useSetupForm } from './useSetupForm.js';

interface Props {
  initial: Profile | null;
  onSave: (profile: Profile) => void;
  onCancel?: () => void;
  onForget?: () => void;
}

/** Submit, plus Cancel and Forget when a saved family is being edited. */
function FormActions({
  onCancel,
  onForget,
}: {
  onCancel: (() => void) | undefined;
  onForget: (() => void) | undefined;
}): ReactElement {
  return (
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
  );
}

/** Collects the family profile. Problems are listed in a summary that takes focus. */
export function SetupForm({ initial, onSave, onCancel, onForget }: Props): ReactElement {
  const { draft, errors, invalid, update, replace, readIntake, submit } = useSetupForm(
    initial,
    onSave,
  );
  return (
    <InvalidFields value={invalid}>
      <form className={styles['form']} onSubmit={submit} noValidate aria-labelledby="setup-title">
        <h1 id="setup-title">{initial ? 'Change your details' : 'Get your family’s smog plan'}</h1>
        <p className={styles['intro']}>
          Your answers are saved on this device only. To write your plan they are sent to our server
          and to Google Gemini, and neither keeps them.
        </p>
        <ErrorSummary errors={errors} />
        <IntakeField onRead={readIntake} />
        <PlaceField
          place={draft.place}
          onChange={(place) => {
            update({ place });
          }}
        />
        <MembersField
          members={draft.members}
          onChange={(members) => {
            update({ members });
          }}
        />
        <LifestyleFields draft={draft} onChange={replace} />
        <div className={styles['narrow']}>
          <SelectField
            label="Language for explanations"
            value={draft.language}
            options={LANGUAGES}
            names={LANGUAGE_LABELS}
            onChange={(language) => {
              update({ language });
            }}
          />
        </div>
        <FormActions onCancel={onCancel} onForget={onForget} />
      </form>
    </InvalidFields>
  );
}
