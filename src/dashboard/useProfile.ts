/**
 * The family's saved profile and whether the setup form is open. The form opens by itself
 * until a profile exists.
 */
import { useState } from 'react';
import type { Profile } from '../domain/schemas.js';
import { clearProfile, loadProfile, saveProfile } from '../lib/storage.js';

/** The saved profile plus the actions the dashboard offers on it. */
export interface ProfileState {
  profile: Profile | null;
  editing: boolean;
  edit: () => void;
  cancel: () => void;
  save: (next: Profile) => void;
  forget: () => void;
}

/**
 * Loads the profile from this device and keeps storage in step with every change.
 * `afterChange` runs after each action, for example to move focus.
 */
export function useProfile(afterChange: () => void): ProfileState {
  const [profile, setProfile] = useState<Profile | null>(loadProfile);
  const [editing, setEditing] = useState(profile === null);
  return {
    profile,
    editing: editing || profile === null,
    edit: () => {
      setEditing(true);
      afterChange();
    },
    cancel: () => {
      setEditing(false);
      afterChange();
    },
    save: (next) => {
      saveProfile(next);
      setProfile(next);
      setEditing(false);
      afterChange();
    },
    forget: () => {
      clearProfile();
      setProfile(null);
      afterChange();
    },
  };
}
