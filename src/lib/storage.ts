/**
 * Keeps the family profile on this device only. Stored data is validated on read, so a stale
 * or tampered entry is ignored instead of crashing the app.
 */
import { choicesSchema, profileSchema, type Profile } from '../domain/schemas.js';

const PROFILE_KEY = 'bw-profile-v1';
const CHOICES_KEY = 'bw-choices-v1';

/** The saved profile, or null when none is stored or it is invalid. */
export function loadProfile(): Profile | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw === null ? null : (profileSchema.safeParse(JSON.parse(raw)).data ?? null);
  } catch {
    return null;
  }
}

/** Saves the profile; silently skipped when storage is unavailable (for example private mode). */
export function saveProfile(profile: Profile): void {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch {
    // The app still works for this visit without storage.
  }
}

/** Forgets the profile. */
export function clearProfile(): void {
  try {
    localStorage.removeItem(PROFILE_KEY);
  } catch {
    // Nothing stored, nothing to clear.
  }
}

/** The actions the family chose, or none when nothing valid is stored. */
export function loadChoices(): string[] {
  try {
    const raw = localStorage.getItem(CHOICES_KEY);
    return choicesSchema.safeParse(raw === null ? [] : JSON.parse(raw)).data ?? [];
  } catch {
    return [];
  }
}

/** Remembers the chosen actions for the next visit. */
export function saveChoices(ids: readonly string[]): void {
  try {
    localStorage.setItem(CHOICES_KEY, JSON.stringify(ids));
  } catch {
    // Choices still work for this visit.
  }
}
