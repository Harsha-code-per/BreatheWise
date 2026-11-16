/**
 * Plain-language labels for impact numbers, shared by every list of actions.
 */
import type { Impact } from '../domain/action.js';

/** One labelled effect, with a tone for styling. */
export interface ImpactLabel {
  text: string;
  tone: 'good' | 'warn';
}

/** Turns an action's impact into short labels, skipping what is not quantified. */
export function impactLabels(impact: Impact): ImpactLabel[] {
  const labels: ImpactLabel[] = [];
  const cut = impact.exposureCut;
  if (cut !== null && cut > 0)
    labels.push({ text: `${String(cut)}% less smoke breathed`, tone: 'good' });
  if (cut !== null && cut < 0)
    labels.push({ text: `${String(-cut)}% more smoke breathed`, tone: 'warn' });
  if (impact.cigarettesWeek) {
    labels.push({
      text: `≈${String(impact.cigarettesWeek)} cigarettes avoided a week`,
      tone: 'good',
    });
  }
  if (impact.co2KgWeek)
    labels.push({ text: `${String(impact.co2KgWeek)} kg CO₂ saved a week`, tone: 'good' });
  return labels;
}

/** "Fri 21 Nov" from a "2026-11-21" date, independent of the viewer's time zone. */
export function shortDate(date: string): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
}
