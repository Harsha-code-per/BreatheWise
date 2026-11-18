/**
 * The setup form's state: the draft being edited, the problems found on submit, and the
 * Gemini intake that fills the draft in from a description.
 */
import { type SubmitEvent, useMemo, useState } from 'react';
import type { Intake, Profile } from '../domain/schemas.js';
import { api } from '../lib/api.js';
import { applyIntake, checkDraft, newDraft, type Draft, type FieldError } from './draft.js';

/** The draft, its problems and the actions the form offers. */
export interface SetupFormState {
  draft: Draft;
  errors: readonly FieldError[];
  invalid: ReadonlySet<string>;
  update: (patch: Partial<Draft>) => void;
  replace: (draft: Draft) => void;
  readIntake: (intake: Intake) => Promise<void>;
  submit: (event: SubmitEvent) => void;
}

/** Starts from the saved profile, or a fresh draft, and saves only a valid profile. */
export function useSetupForm(
  initial: Profile | null,
  onSave: (profile: Profile) => void,
): SetupFormState {
  const [draft, setDraft] = useState<Draft>(initial ?? newDraft);
  const [errors, setErrors] = useState<FieldError[]>([]);
  const invalid = useMemo(() => new Set(errors.map((error) => error.field)), [errors]);
  const update = (patch: Partial<Draft>) => {
    setDraft((current) => ({ ...current, ...patch }));
  };
  return {
    draft,
    errors,
    invalid,
    update,
    replace: setDraft,
    async readIntake(intake) {
      setDraft((current) => applyIntake(current, intake));
      const [found] = intake.city ? await api.places(intake.city).catch(() => []) : [];
      if (found) update({ place: found });
    },
    submit(event) {
      event.preventDefault();
      const result = checkDraft(draft);
      if ('profile' in result) onSave(result.profile);
      else setErrors(result.errors);
    },
  };
}
