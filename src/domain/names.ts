/**
 * Display names shared by the interface and the AI prompts, defined once.
 */
import { PLACE_NAME_MAX, type Language } from './schemas.js';

/** Each supported language's English name (for prompts) and native name (for the picker). */
export const LANGUAGE_NAMES: Readonly<Record<Language, { english: string; native: string }>> = {
  en: { english: 'English', native: 'English' },
  hi: { english: 'Hindi', native: 'हिन्दी' },
  bn: { english: 'Bengali', native: 'বাংলা' },
  mr: { english: 'Marathi', native: 'मराठी' },
  ta: { english: 'Tamil', native: 'தமிழ்' },
};

/** Joins the known parts of a place ("Pune", "Maharashtra", "India") into one bounded name. */
export function placeName(parts: readonly (string | undefined)[]): string {
  return parts.filter(Boolean).join(', ').slice(0, PLACE_NAME_MAX);
}

/** "Delhi" from "Delhi, National Capital Territory of Delhi, India". */
export function shortPlaceName(name: string): string {
  return name.split(',', 1).join('').trim();
}
