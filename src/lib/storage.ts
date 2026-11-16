/**
 * Keeps the family profile on this device only. Stored data is validated on read, so a stale
 * or tampered entry is ignored instead of crashing the app.
 */
import { profileSchema, type Profile } from '../domain/schemas.js';

const PROFILE_KEY = 'bw-profile-v1';
const THEME_KEY = 'bw-theme';

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

/** Remembers an explicit theme choice for the next visit. */
export function saveTheme(theme: 'light' | 'dark'): void {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // The choice still applies to this visit.
  }
}
