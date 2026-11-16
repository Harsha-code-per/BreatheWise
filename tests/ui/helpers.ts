import axe from 'axe-core';
import { vi, type MockInstance } from 'vitest';
import type { AirSnapshot } from '../../src/domain/schemas';
import { makeAir } from '../fixtures';

/** Accessibility violations found by axe-core (colour contrast needs a real renderer, so it is checked in e2e). */
export async function a11yViolations(container: Element): Promise<string[]> {
  const results = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } });
  return results.violations.map((violation) => `${violation.id}: ${violation.help}`);
}

type Reply = () => Response | Promise<Response>;

/** Stubs the BreatheWise API. Unlisted endpoints answer with the engine-only defaults. */
export function mockApi(
  replies: Partial<Record<'air' | 'plan' | 'ask' | 'places', Reply>> = {},
  air: AirSnapshot = makeAir(),
): MockInstance<typeof fetch> {
  const defaults: Record<string, Reply> = {
    air: () => Response.json(air),
    plan: () =>
      Response.json({
        source: 'engine',
        briefing: { headline: 'Engine headline', summary: 'Engine summary.', explanations: [] },
      }),
    ask: () => Response.json({ answer: 'Keep windows shut until noon.', source: 'ai' }),
    places: () => Response.json({ places: [{ name: 'Delhi, India', lat: 28.61, lon: 77.21 }] }),
  };
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const path = (input instanceof Request ? input.url : input.toString()).replace('/api/', '');
    const reply = replies[path as keyof typeof replies] ?? defaults[path];
    if (!reply) throw new Error(`Unexpected request ${path}`);
    return reply();
  });
}

/** Overrides matchMedia so chosen queries match. */
export function mediaMatches(...queries: string[]): void {
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (query: string) => ({ matches: queries.includes(query), media: query }) as MediaQueryList,
  );
}
