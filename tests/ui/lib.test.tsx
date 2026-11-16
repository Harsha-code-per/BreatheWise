/** @vitest-environment jsdom */
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { api, RequestFailed } from '../../src/lib/api';
import { impactLabels, shortDate } from '../../src/lib/format';
import {
  clearProfile,
  loadChoices,
  loadProfile,
  saveChoices,
  saveProfile,
} from '../../src/lib/storage';
import { useRemote } from '../../src/lib/useRemote';
import { makeProfile } from '../fixtures';
import { mockApi } from './helpers';

describe('api client', () => {
  it('validates successful responses', async () => {
    mockApi();
    expect(await api.places('Del')).toEqual([{ name: 'Delhi, India', lat: 28.61, lon: 77.21 }]);
    expect((await api.ask(makeProfile(), 'Hi?')).source).toBe('ai');
    expect((await api.plan(makeProfile())).source).toBe('engine');
    expect((await api.air(makeProfile().place)).hours).toHaveLength(48);
  });

  it.each([
    [
      'a network failure',
      () => Promise.reject(new TypeError('offline')),
      'could not reach the server',
    ],
    [
      'an API error',
      () =>
        Response.json(
          { error: { code: 'RATE_LIMITED', message: 'Too many requests.' } },
          { status: 429 },
        ),
      'Too many requests.',
    ],
    [
      'an error without a body',
      () => new Response('oops', { status: 500 }),
      'could not reach the server',
    ],
    [
      'an error with an odd body',
      () => Response.json({ error: 'x' }, { status: 500 }),
      'could not reach the server',
    ],
    [
      'an error with no message',
      () => Response.json({ error: { code: 1 } }, { status: 500 }),
      'could not reach the server',
    ],
    ['a malformed success', () => Response.json({ places: 'nope' }), 'unexpected reply'],
  ])('turns %s into a readable message', async (_, reply, message) => {
    mockApi({ places: reply });
    const failure = api.places('Del');
    await expect(failure).rejects.toBeInstanceOf(RequestFailed);
    await expect(failure).rejects.toThrow(message);
  });
});

describe('storage', () => {
  it('round-trips a valid profile and ignores invalid ones', () => {
    expect(loadProfile()).toBeNull();
    saveProfile(makeProfile());
    expect(loadProfile()?.place.name).toBe('Delhi');
    localStorage.setItem('bw-profile-v1', '{"members":[]}');
    expect(loadProfile()).toBeNull();
    localStorage.setItem('bw-profile-v1', '{broken');
    expect(loadProfile()).toBeNull();
    clearProfile();
    expect(localStorage.getItem('bw-profile-v1')).toBeNull();
    expect(loadChoices()).toEqual([]);
    saveChoices(['air-out']);
    expect(loadChoices()).toEqual(['air-out']);
    localStorage.setItem('bw-choices-v1', '{oops');
    expect(loadChoices()).toEqual([]);
    localStorage.setItem('bw-choices-v1', '[1]');
    expect(loadChoices()).toEqual([]);
  });

  it('keeps working when storage is blocked', () => {
    const blocked = () => {
      throw new Error('blocked');
    };
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(blocked);
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(blocked);
    expect(() => {
      saveProfile(makeProfile());
      saveChoices(['x']);
      clearProfile();
    }).not.toThrow();
  });
});

describe('format', () => {
  it('labels each kind of impact', () => {
    expect(
      impactLabels({ exposureCut: 40, co2KgWeek: 2, cigarettesWeek: 1.5 }).map(
        (label) => label.text,
      ),
    ).toEqual([
      '40% less smoke breathed',
      '≈1.5 cigarettes avoided a week',
      '2 kg CO₂ saved a week',
    ]);
    expect(impactLabels({ exposureCut: -20, co2KgWeek: 0, cigarettesWeek: null })).toEqual([
      { text: '20% more smoke breathed', tone: 'warn' },
    ]);
    expect(impactLabels({ exposureCut: 0, co2KgWeek: null, cigarettesWeek: 0 })).toEqual([]);
  });

  it('formats dates the same in every time zone', () => {
    expect(shortDate('2026-11-21')).toBe('Sat 21 Nov');
  });
});

describe('useRemote', () => {
  it('moves from loading to ready, and retries on demand', async () => {
    const load = vi.fn().mockResolvedValueOnce('first').mockResolvedValueOnce('second');
    const { result } = renderHook(() => useRemote(load));
    expect(result.current[0].status).toBe('loading');
    await waitFor(() => {
      expect(result.current[0]).toEqual({ status: 'ready', data: 'first' });
    });
    act(() => {
      result.current[1]();
    });
    await waitFor(() => {
      expect(result.current[0]).toEqual({ status: 'ready', data: 'second' });
    });
  });

  it('shows friendly messages for failures', async () => {
    const known = vi.fn(() => Promise.reject(new RequestFailed('Known problem.')));
    const unknown = vi.fn(() => Promise.reject(new Error('internal')));
    const first = renderHook(() => useRemote(known));
    const second = renderHook(() => useRemote(unknown));
    await waitFor(() => {
      expect(first.result.current[0]).toEqual({ status: 'error', message: 'Known problem.' });
      expect(second.result.current[0]).toEqual({
        status: 'error',
        message: 'Something went wrong. Please try again.',
      });
    });
  });

  it('ignores results that arrive after unmounting', async () => {
    let resolve: (value: string) => void = () => undefined;
    const load = () => new Promise<string>((done) => (resolve = done));
    const { result, unmount } = renderHook(() => useRemote(load));
    unmount();
    resolve('late');
    await Promise.resolve();
    expect(result.current[0].status).toBe('loading');
  });
});
