/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { applyIntake, checkDraft, newDraft, newMember } from '../../src/setup/draft';
import { SetupForm } from '../../src/setup/SetupForm';
import { makeProfile } from '../fixtures';
import { a11yViolations, mockApi } from './helpers';

function stubGeolocation(
  answer: (ok: PositionCallback, fail: PositionErrorCallback) => void,
): void {
  Object.assign(navigator, { geolocation: { getCurrentPosition: answer } });
}

function renderForm() {
  const onSave = vi.fn();
  const view = render(<SetupForm initial={null} onSave={onSave} />);
  return { ...view, onSave };
}

async function choosePlace() {
  await userEvent.type(screen.getByLabelText('City or town'), 'Delhi{Enter}');
  await userEvent.click(await screen.findByRole('radio', { name: 'Delhi, India' }));
}

describe('checkDraft', () => {
  it('asks for a place first, names unnamed members, then reports problems by section', () => {
    expect(checkDraft(newDraft())).toEqual({
      errors: ['Choose your city, or use your current location.'],
    });
    const draft = { ...newDraft(), place: makeProfile().place };
    const twoUnnamed = { ...draft, members: [newMember(0), newMember(1, 'child')] };
    const result = checkDraft(twoUnnamed);
    expect('profile' in result && result.profile.members.map((member) => member.name)).toEqual([
      'You',
      'Person 2',
    ]);
    const broken = {
      ...draft,
      commute: { ...draft.commute, km: Number.NaN },
      home: { ...draft.home, areaM2: 1 },
    };
    expect(checkDraft(broken)).toEqual({
      errors: ['Commute: check the km value.', 'Home: check the areaM2 value.'],
    });
    expect(checkDraft({ ...draft, members: [] })).toEqual({
      errors: ['Family: check the members value.'],
    });
  });

  it('labels unknown sections generically', () => {
    const draft = { ...newDraft(), place: makeProfile().place, language: 'xx' } as never;
    expect(checkDraft(draft)).toEqual({ errors: ['Language: check the language value.'] });
    expect(checkDraft({ ...newDraft(), place: { name: '', lat: 0, lon: 0 } })).toEqual({
      errors: ['Your answers: check the name value.'],
    });
  });
});

describe('applyIntake', () => {
  it('fills only the fields the description mentions', () => {
    const draft = newDraft();
    const merged = applyIntake(draft, {
      members: [{ name: 'Nani', group: 'older', respiratory: true, outdoorWork: false }],
      commuteMode: 'bus',
      cooking: 'biomass',
      exerciseMinutes: 45,
    });
    expect(merged.members).toEqual([
      { id: 'member-0', name: 'Nani', group: 'older', respiratory: true, outdoorWork: false },
    ]);
    expect(merged.commute).toEqual({ ...draft.commute, mode: 'bus' });
    expect(merged.home).toEqual({ ...draft.home, cooking: 'biomass' });
    expect(merged.exercise).toEqual({ minutes: 45, outdoors: true });
    expect(applyIntake(draft, { members: [] }).members).toBe(draft.members);
    expect(applyIntake(draft, {})).toEqual(draft);
  });
});

describe('SetupForm', () => {
  it('lists problems in a summary that takes focus', async () => {
    const { onSave } = renderForm();
    await userEvent.click(screen.getByRole('button', { name: 'Show my plan' }));
    const summary = screen.getByRole('alert');
    expect(summary).toHaveFocus();
    expect(summary).toHaveTextContent('Please fix one thing');
    expect(onSave).not.toHaveBeenCalled();
  });

  it('counts several problems', async () => {
    mockApi();
    renderForm();
    await choosePlace();
    await userEvent.clear(screen.getByLabelText('Main room size (m²)'));
    await userEvent.clear(screen.getByLabelText('One-way distance (km)'));
    await userEvent.click(screen.getByRole('button', { name: 'Show my plan' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Please fix 2 things');
  });

  it('builds a full profile from every field', async () => {
    mockApi();
    const { onSave, container } = renderForm();
    await choosePlace();
    expect(screen.getByText(/Selected: Delhi, India/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Add a family member' }));
    const names = screen.getAllByLabelText('Name');
    await userEvent.type(names[1]!, 'Mira');
    await userEvent.selectOptions(screen.getAllByLabelText('Age group')[1]!, 'older');
    await userEvent.click(screen.getAllByLabelText('Asthma, lung or heart condition')[1]!);
    await userEvent.click(screen.getAllByLabelText('Works outdoors')[0]!);
    await userEvent.selectOptions(screen.getByLabelText('How you travel'), 'metro');
    fireEvent.change(screen.getByLabelText('One-way distance (km)'), { target: { value: '12' } });
    fireEvent.change(screen.getByLabelText('Days a week'), { target: { value: '4' } });
    await userEvent.selectOptions(screen.getByLabelText('Usually leave at'), '09:00');
    fireEvent.change(screen.getByLabelText('Main room size (m²)'), { target: { value: '30' } });
    fireEvent.change(screen.getByLabelText(/Purifier CADR/), { target: { value: '400' } });
    await userEvent.selectOptions(screen.getByLabelText('Cooking fuel'), 'biomass');
    await userEvent.selectOptions(screen.getByLabelText('Winter heating'), 'coal');
    fireEvent.change(screen.getByLabelText('Minutes a day'), { target: { value: '60' } });
    await userEvent.click(screen.getByLabelText('Usually outdoors'));
    await userEvent.selectOptions(screen.getByLabelText('Language for explanations'), 'hi');
    expect(await a11yViolations(container)).toEqual([]);
    await userEvent.click(screen.getByRole('button', { name: 'Show my plan' }));
    expect(onSave).toHaveBeenCalledWith({
      place: { name: 'Delhi, India', lat: 28.61, lon: 77.21 },
      members: [
        { id: 'member-0', name: 'You', group: 'adult', respiratory: false, outdoorWork: true },
        { id: 'member-1', name: 'Mira', group: 'older', respiratory: true, outdoorWork: false },
      ],
      commute: { mode: 'metro', km: 12, daysPerWeek: 4, departHour: 9, returnHour: 18 },
      home: { areaM2: 30, purifierCadr: 400, cooking: 'biomass', heating: 'coal' },
      exercise: { minutes: 60, outdoors: false },
      language: 'hi',
    });
  });

  it('removes members and stops adding at twelve', async () => {
    render(
      <SetupForm
        initial={{ ...makeProfile(), members: makeProfile().members.slice(0, 2) }}
        onSave={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Remove Ravi' }));
    expect(screen.getAllByLabelText('Name')).toHaveLength(1);
    expect(screen.queryByRole('button', { name: /Remove/ })).not.toBeInTheDocument();
    await userEvent.clear(screen.getByLabelText('Name'));
    for (let count = 1; count < 12; count += 1) {
      await userEvent.click(screen.getByRole('button', { name: 'Add a family member' }));
    }
    expect(screen.queryByRole('button', { name: 'Add a family member' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Remove this person' })).toHaveLength(12);
  });

  it.each([
    ['a too-short query', 'D', undefined, 'Type at least two letters of your city.'],
    [
      'no matches',
      'Zzz',
      () => Response.json({ places: [] }),
      'No places found. Try a nearby larger city.',
    ],
    [
      'an API error',
      'Zzz',
      () => Response.json({ error: { message: 'Too many requests.' } }, { status: 429 }),
      'Too many requests.',
    ],
  ])('explains search with %s', async (_, query, reply, message) => {
    mockApi(reply ? { places: reply } : {});
    renderForm();
    await userEvent.type(screen.getByLabelText('City or town'), query);
    await userEvent.click(screen.getByRole('button', { name: 'Search' }));
    expect(await screen.findByText(message)).toBeInTheDocument();
  });

  it('explains unexpected search failures and counts results', async () => {
    const { api } = await import('../../src/lib/api');
    vi.spyOn(api, 'places').mockRejectedValueOnce(new Error('bug'));
    renderForm();
    await userEvent.type(screen.getByLabelText('City or town'), 'Delhi');
    await userEvent.click(screen.getByRole('button', { name: 'Search' }));
    expect(await screen.findByText('Search failed. Try again.')).toBeInTheDocument();
    mockApi();
    await userEvent.click(screen.getByRole('button', { name: 'Search' }));
    expect(await screen.findByText('1 places found.')).toBeInTheDocument();
  });

  it('names the browser location and fills the search box', async () => {
    mockApi({
      locate: () => Response.json({ name: 'Chennai, Tamil Nadu, India', lat: 13.08, lon: 80.27 }),
    });
    stubGeolocation((ok) => {
      ok({ coords: { latitude: 13.0827, longitude: 80.2707 } } as GeolocationPosition);
    });
    const { onSave } = renderForm();
    await userEvent.click(screen.getByRole('button', { name: 'Use my location' }));
    expect(await screen.findByText('Found you: Chennai, Tamil Nadu, India.')).toBeInTheDocument();
    expect(screen.getByLabelText('City or town')).toHaveValue('Chennai, Tamil Nadu, India');
    await userEvent.click(screen.getByRole('button', { name: 'Show my plan' }));
    expect(onSave.mock.calls[0]?.[0].place).toEqual({
      name: 'Chennai, Tamil Nadu, India',
      lat: 13.08,
      lon: 80.27,
    });
  });

  it('explains a blocked permission', async () => {
    stubGeolocation((_, fail) => {
      fail({ code: 1 } as GeolocationPositionError);
    });
    renderForm();
    await userEvent.click(screen.getByRole('button', { name: 'Use my location' }));
    expect(await screen.findByText(/Location access is blocked/)).toBeInTheDocument();
  });

  it.each([
    [
      'the browser cannot pinpoint the device',
      () => {
        stubGeolocation((_, fail) => {
          fail({ code: 2 } as GeolocationPositionError);
        });
      },
    ],
    [
      'the browser has no geolocation',
      () => {
        Reflect.deleteProperty(navigator, 'geolocation');
      },
    ],
  ])('falls back to the network location when %s', async (_, setup) => {
    mockApi({ locate: () => Response.json({ name: 'Chennai', lat: 13.08, lon: 80.27 }) });
    setup();
    renderForm();
    await userEvent.click(screen.getByRole('button', { name: 'Use my location' }));
    expect(await screen.findByText(/approximate location: Chennai/)).toBeInTheDocument();
  });

  it('falls back when naming the coordinates fails, and explains when nothing works', async () => {
    const locate = vi
      .fn()
      .mockReturnValueOnce(new Response('', { status: 500 }))
      .mockReturnValueOnce(
        Response.json(
          {
            error: {
              message: 'We could not work out your location. Search for your city instead.',
            },
          },
          { status: 404 },
        ),
      );
    mockApi({ locate });
    stubGeolocation((ok) => {
      ok({ coords: { latitude: 1, longitude: 2 } } as GeolocationPosition);
    });
    renderForm();
    await userEvent.click(screen.getByRole('button', { name: 'Use my location' }));
    expect(
      await screen.findByText('We could not work out your location. Search for your city instead.'),
    ).toBeInTheDocument();
    const { api } = await import('../../src/lib/api');
    vi.spyOn(api, 'locate').mockRejectedValue(new Error('bug'));
    await userEvent.click(screen.getByRole('button', { name: 'Use my location' }));
    expect(
      await screen.findByText('We could not find your location. Search for your city instead.'),
    ).toBeInTheDocument();
  });

  it('fills the form from a description, including the city', async () => {
    mockApi({
      intake: () =>
        Response.json({
          intake: {
            city: 'Delhi',
            members: [{ name: 'Asha', group: 'adult', respiratory: false, outdoorWork: false }],
          },
        }),
    });
    renderForm();
    await userEvent.click(screen.getByRole('button', { name: 'Fill in the form for me' }));
    expect(
      screen.getByText('Write a sentence or two about your family first.'),
    ).toBeInTheDocument();
    await userEvent.type(
      screen.getByLabelText('Your family in your own words'),
      'Just me, Asha, in Delhi.',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Fill in the form for me' }));
    expect(await screen.findByText(/Filled in from your description/)).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toHaveValue('Asha');
    expect(screen.getByText('Selected: Delhi, India.')).toBeInTheDocument();
  });

  it.each([
    [
      'Gemini is busy',
      () =>
        Response.json(
          {
            error: {
              message:
                'Gemini is busy right now. Fill in the form below, or try again in a minute.',
            },
          },
          { status: 503 },
        ),
      /Gemini is busy/,
    ],
    [
      'the city is unknown',
      () => Response.json({ intake: { city: 'Atlantis' } }),
      /Filled in from your description/,
    ],
    [
      'no city is mentioned',
      () => Response.json({ intake: { exerciseMinutes: 20 } }),
      /Filled in from your description/,
    ],
  ])('copes when %s', async (_, intake, message) => {
    mockApi({ intake, places: () => Response.json({ error: { message: 'x' } }, { status: 500 }) });
    renderForm();
    await userEvent.type(screen.getByLabelText('Your family in your own words'), 'Two of us.');
    await userEvent.click(screen.getByRole('button', { name: 'Fill in the form for me' }));
    expect(await screen.findByText(message)).toBeInTheDocument();
  });

  it('explains unexpected intake failures', async () => {
    const { api } = await import('../../src/lib/api');
    vi.spyOn(api, 'intake').mockRejectedValueOnce(new Error('bug'));
    renderForm();
    await userEvent.type(screen.getByLabelText('Your family in your own words'), 'Two of us.');
    await userEvent.click(screen.getByRole('button', { name: 'Fill in the form for me' }));
    expect(
      await screen.findByText('Something went wrong. Fill in the form below.'),
    ).toBeInTheDocument();
  });
});
