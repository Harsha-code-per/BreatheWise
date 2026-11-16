import { describe, expect, it, vi } from 'vitest';
import { POST as air } from '../../api/air';
import { POST as ask } from '../../api/ask';
import { POST as places } from '../../api/places';
import { POST as plan } from '../../api/plan';
import { aiService } from '../../api/_lib/ai/instance';
import { makeProfile } from '../fixtures';
import { fakeOpenMeteo, post } from './helpers';

const profile = { ...makeProfile(), place: { name: 'Pune', lat: 18.52, lon: 73.85 } };

describe('API routes', () => {
  it('serves air data and place search', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(fakeOpenMeteo());
    const airResponse = await air(post('air', { place: profile.place }));
    expect(airResponse.status).toBe(200);
    expect(((await airResponse.json()) as { hours: unknown[] }).hours).toHaveLength(23);
    const placesResponse = await places(post('places', { query: 'Del' }));
    expect(await placesResponse.json()).toEqual({
      places: [expect.objectContaining({ lat: 28.65 })],
    });
  });

  it('writes a briefing and answers questions from the engine when no AI key is set', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(fakeOpenMeteo());
    const planResponse = await plan(post('plan', { profile }));
    expect(await planResponse.json()).toMatchObject({
      source: 'engine',
      briefing: { headline: expect.any(String) },
    });
    const askResponse = await ask(post('ask', { profile, question: 'Should I open the windows?' }));
    expect(await askResponse.json()).toMatchObject({
      source: 'engine',
      answer: expect.stringContaining('Pune'),
    });
    expect(aiService()).toBe(aiService());
  });

  it('validates profiles before doing any work', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch');
    const response = await plan(post('plan', { profile: { ...profile, members: [] } }));
    expect(response.status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });
});
