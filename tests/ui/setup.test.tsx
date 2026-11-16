/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { checkDraft, newDraft } from '../../src/setup/draft';
import { SetupForm } from '../../src/setup/SetupForm';
import { makeProfile } from '../fixtures';
import { a11yViolations, mockApi } from './helpers';

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
  it('asks for a place first, then names problems by section', () => {
    expect(checkDraft(newDraft())).toEqual({
      errors: ['Choose your city, or use your current location.'],
    });
    const draft = { ...newDraft(), place: makeProfile().place };
    expect(checkDraft(draft)).toHaveProperty('profile');
    const unnamed = { ...draft, members: [{ ...draft.members[0]!, name: ' ' }] };
    expect(checkDraft(unnamed)).toEqual({ errors: ['Family: give every family member a name.'] });
    const broken = {
      ...draft,
      commute: { ...draft.commute, km: Number.NaN },
      home: { ...draft.home, areaM2: 1 },
    };
    expect(checkDraft(broken)).toEqual({
      errors: ['Commute: check the km value.', 'Home: check the areaM2 value.'],
    });
    expect(checkDraft({ ...draft, extra: 1, members: [] } as never)).toEqual({
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
    await userEvent.clear(screen.getByLabelText('Name'));
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
        { id: 'member-0', name: 'Me', group: 'adult', respiratory: false, outdoorWork: true },
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

  it('uses the browser location, rounded to about a kilometre, or explains a refusal', async () => {
    const getCurrentPosition = vi
      .fn()
      .mockImplementationOnce((ok: PositionCallback) => {
        ok({ coords: { latitude: 28.61394, longitude: 77.20902 } } as GeolocationPosition);
      })
      .mockImplementationOnce((_: PositionCallback, fail: PositionErrorCallback) => {
        fail({} as GeolocationPositionError);
      });
    Object.assign(navigator, { geolocation: { getCurrentPosition } });
    const { onSave } = renderForm();
    await userEvent.click(screen.getByRole('button', { name: 'Use my location' }));
    expect(screen.getByText(/Using your current location/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Show my plan' }));
    expect(onSave.mock.calls[0]?.[0].place).toEqual({
      name: 'My location',
      lat: 28.61,
      lon: 77.21,
    });
    await userEvent.click(screen.getByRole('button', { name: 'Use my location' }));
    expect(screen.getByText(/Location was not shared/)).toBeInTheDocument();
  });
});
