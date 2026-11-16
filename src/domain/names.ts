/**
 * Display names shared by the interface and the AI prompts, defined once.
 */
import type { Language } from './schemas.js';

/** Each supported language's English name (for prompts) and native name (for the picker). */
export const LANGUAGE_NAMES: Readonly<Record<Language, { english: string; native: string }>> = {
  en: { english: 'English', native: 'English' },
  hi: { english: 'Hindi', native: 'हिन्दी' },
  bn: { english: 'Bengali', native: 'বাংলা' },
  mr: { english: 'Marathi', native: 'मराठी' },
  ta: { english: 'Tamil', native: 'தமிழ்' },
};

/** "Delhi" from "Delhi, National Capital Territory of Delhi, India". */
export function shortPlaceName(name: string): string {
  return name.split(',', 1).join('').trim();
}
