/**
 * Human-readable labels for every option in the setup form.
 */
import { LANGUAGE_NAMES } from '../domain/names.js';
import { LANGUAGES, type Language, type Member, type Profile } from '../domain/schemas.js';

/** Labels for mode options. */
export const MODE_NAMES: Readonly<Record<Profile['commute']['mode'], string>> = {
  car: 'Car, alone',
  carpool: 'Car, shared',
  motorbike: 'Motorbike or scooter',
  bus: 'Bus',
  metro: 'Metro or train',
  cycle: 'Bicycle',
  walk: 'On foot',
};
/** Labels for fuel options. */
export const FUEL_NAMES: Readonly<Record<Profile['home']['cooking'], string>> = {
  electric: 'Electric or induction',
  lpg: 'LPG or piped gas',
  kerosene: 'Kerosene',
  biomass: 'Wood, dung or coal',
};
/** Labels for heat options. */
export const HEAT_NAMES: Readonly<Record<Profile['home']['heating'], string>> = {
  none: 'No heating',
  electric: 'Electric heater',
  gas: 'Gas heater',
  wood: 'Wood fire or stove',
  coal: 'Coal or angithi',
};
/** Labels for group options. */
export const GROUP_LABELS: Readonly<Record<Member['group'], string>> = {
  adult: 'Adult',
  child: 'Child',
  older: 'Over 65',
  pregnant: 'Pregnant',
};
/** Language options: English as is, the others in their own script with the English name after. */
export const LANGUAGE_LABELS = Object.fromEntries(
  LANGUAGES.map((language) => {
    const { native, english } = LANGUAGE_NAMES[language];
    return [language, language === 'en' ? english : `${native} (${english})`];
  }),
) as Readonly<Record<Language, string>>;
