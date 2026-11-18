/** @vitest-environment jsdom */
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Dashboard } from '../../src/dashboard/Dashboard';
import { api } from '../../src/lib/api';
import { saveProfile } from '../../src/lib/storage';
import { makeAir, makeProfile } from '../fixtures';
import { a11yViolations, mockApi } from './helpers';

const aiPlan = {
  source: 'ai',
  briefing: {
    headline: 'A smoggy morning, a clear afternoon',
    summary: 'Stay in until noon.',
    explanations: [{ id: 'diy-filter-box', why: 'Gemini says: this matters most for Mira.' }],
  },
};

async function openDashboard() {
  saveProfile(makeProfile());
  const view = render(<Dashboard />);
  await screen.findByRole('heading', { name: 'Air in Delhi now' });
  return view;
}

describe('Dashboard with a saved family', () => {
  it('shows the air, the engine briefing, then the AI version', async () => {
    let finish: (response: Response) => void = () => undefined;
    mockApi({ plan: () => new Promise((done) => (finish = done)) });
    const { container } = await openDashboard();
    expect(screen.getAllByText('270').length).toBeGreaterThan(0);
    expect(screen.getByText(/Smog is trapped near the ground/)).toBeInTheDocument();
    expect(screen.getByText('Extra care today for Mira, Nani.')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Smog is trapped over Delhi right now' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Gemini is personalising this for your family…')).toBeInTheDocument();
    finish(Response.json(aiPlan));
    expect(
      await screen.findByRole('heading', { name: aiPlan.briefing.headline }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Written by Gemini/)).toBeInTheDocument();
    expect(await a11yViolations(container)).toEqual([]);
  });

  it('labels engine-written briefings', async () => {
    mockApi();
    await openDashboard();
    expect(
      await screen.findByText(/Written by BreatheWise from your forecast/),
    ).toBeInTheDocument();
  });

  it('moves between tabs with the keyboard and shows AI explanations', async () => {
    mockApi({ plan: () => Response.json(aiPlan) });
    await openDashboard();
    await screen.findByText(/Written by Gemini/);
    const today = screen.getByRole('tab', { name: 'Today' });
    expect(screen.getByRole('heading', { name: 'Today’s plan' })).toBeInTheDocument();
    today.focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'At home' })).toHaveFocus();
    expect(screen.getByText('Gemini says: this matters most for Mira.')).toBeInTheDocument();
    await userEvent.keyboard('{End}');
    expect(screen.getByRole('tab', { name: 'Ask' })).toHaveAttribute('aria-selected', 'true');
    await userEvent.keyboard('{Home}{ArrowLeft}');
    expect(screen.getByRole('tab', { name: 'Ask' })).toHaveFocus();
    await userEvent.keyboard('a');
    await userEvent.click(screen.getByRole('tab', { name: 'Greener choices' }));
    expect(screen.getByText('Switch from driving alone to cycling')).toBeInTheDocument();
  });

  it('says when a plan is for tomorrow and when nothing needs changing', async () => {
    mockApi(
      {},
      {
        ...makeAir('2026-11-20T19:00'),
        hours: makeAir('2026-11-20T19:00').hours.map((hour) => ({ ...hour, blh: 900 })),
      },
    );
    const adults = makeProfile().members.slice(0, 2);
    saveProfile(
      makeProfile({
        members: adults,
        exercise: { minutes: 0, outdoors: false },
        commute: { mode: 'walk', km: 0, daysPerWeek: 0, departHour: 8, returnHour: 18 },
      }),
    );
    render(<Dashboard />);
    expect(await screen.findByRole('heading', { name: 'Tomorrow’s plan' })).toBeInTheDocument();
    expect(screen.queryByText(/Extra care today/)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: 'Greener choices' }));
    expect(screen.getByText('Your travel is already low-carbon.')).toBeInTheDocument();
  });

  it('answers questions and reports failures in the conversation', async () => {
    mockApi({
      ask: vi
        .fn()
        .mockReturnValueOnce(Response.json({ answer: 'Use an N95.', source: 'engine' }))
        .mockReturnValueOnce(new Response('', { status: 500 })),
    });
    await openDashboard();
    await userEvent.click(screen.getByRole('tab', { name: 'Ask' }));
    await userEvent.click(screen.getByRole('button', { name: 'Which mask actually works?' }));
    const log = screen.getByRole('log');
    expect(await within(log).findByText('Use an N95.')).toBeInTheDocument();
    expect(within(log).getByText('Answered by BreatheWise')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Your question'), 'x{Enter}');
    expect(within(log).queryByText('x')).not.toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Your question'), 'Can we go out?{Enter}');
    expect(await within(log).findByText(/could not reach the server/)).toBeInTheDocument();
    expect(within(log).getByText('Not answered')).toBeInTheDocument();
  });

  it('labels AI answers and survives unexpected errors', async () => {
    mockApi({
      ask: vi.fn().mockReturnValueOnce(Response.json({ answer: 'Stay in.', source: 'ai' })),
    });
    await openDashboard();
    await userEvent.click(screen.getByRole('tab', { name: 'Ask' }));
    await userEvent.type(screen.getByLabelText('Your question'), 'Go out?{Enter}');
    expect(await screen.findByText('Answered by Gemini')).toBeInTheDocument();
    vi.spyOn(api, 'ask').mockRejectedValueOnce(new Error('boom'));
    await userEvent.type(screen.getByLabelText('Your question'), 'Again?{Enter}');
    expect(await screen.findByText('Something went wrong.')).toBeInTheDocument();
  });

  it('shares the community plan, or copies it, and reports cancellation', async () => {
    mockApi();
    await openDashboard();
    await userEvent.click(screen.getByRole('tab', { name: 'Neighbours' }));
    const share = vi
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('cancel'));
    Object.assign(navigator, { share });
    await userEvent.click(screen.getByRole('button', { name: 'Share with neighbours' }));
    expect(await screen.findByText('Shared.')).toBeInTheDocument();
    expect(String(share.mock.calls[0]?.[0]?.text)).toContain('Start a walking school bus at 09:00');
    await userEvent.click(screen.getByRole('button', { name: 'Share with neighbours' }));
    expect(await screen.findByText('Sharing was cancelled.')).toBeInTheDocument();
    Reflect.deleteProperty(navigator, 'share');
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    await userEvent.click(screen.getByRole('button', { name: 'Share with neighbours' }));
    expect(await screen.findByText(/Copied/)).toBeInTheDocument();
    expect(writeText).toHaveBeenCalled();
  });

  it('retries after the forecast fails to load', async () => {
    mockApi({
      air: vi
        .fn()
        .mockReturnValueOnce(
          Response.json(
            {
              error: {
                code: 'UPSTREAM_UNAVAILABLE',
                message: 'Air-quality data is unavailable right now.',
              },
            },
            { status: 502 },
          ),
        )
        .mockReturnValue(Response.json(makeAir())),
    });
    saveProfile(makeProfile());
    render(<Dashboard />);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Air-quality data is unavailable right now.',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('heading', { name: 'Air in Delhi now' })).toBeInTheDocument();
  });

  it('edits, cancels, forgets the family and returns home', async () => {
    mockApi();
    await openDashboard();
    await userEvent.click(screen.getByRole('button', { name: 'Change details' }));
    expect(screen.getByRole('heading', { name: 'Change your details' })).toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveFocus();
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('main')).toHaveFocus();
    await userEvent.click(screen.getByRole('button', { name: 'Change details' }));
    await userEvent.click(screen.getByRole('button', { name: 'Forget my family' }));
    expect(
      screen.getByRole('heading', { name: 'Get your family’s smog plan' }),
    ).toBeInTheDocument();
    expect(localStorage.getItem('bw-profile-v1')).toBeNull();
    await userEvent.click(screen.getByRole('link', { name: 'BreatheWise home' }));
    await waitFor(() => {
      expect(window.location.pathname).toBe('/');
    });
  });

  it('saves a new family and shows its plan', async () => {
    mockApi();
    render(<Dashboard />);
    await userEvent.type(screen.getByLabelText('City or town'), 'Delhi{Enter}');
    await userEvent.click(await screen.findByRole('radio', { name: 'Delhi, India' }));
    await userEvent.click(screen.getByRole('button', { name: 'Show my plan' }));
    expect(await screen.findByRole('heading', { name: 'Air in Delhi now' })).toBeInTheDocument();
    expect(localStorage.getItem('bw-profile-v1')).toContain('Delhi');
  });

  it('adds up the steps the family chooses and remembers them', async () => {
    mockApi();
    const { unmount } = await openDashboard();
    expect(screen.getByText('Delhi, 4 people')).toBeInTheDocument();
    const impact = screen.getByRole('region', { name: 'Your choices' });
    expect(impact).toHaveTextContent('Tap “I’ll do this”');
    await userEvent.click(screen.getByRole('tab', { name: 'At home' }));
    const filter = screen.getByRole('button', {
      name: 'I’ll do this',
      description: /Build a box-fan filter/,
    });
    await userEvent.click(filter);
    expect(filter).toHaveAttribute('aria-pressed', 'true');
    expect(impact).toHaveTextContent(
      '1 step chosen. Together they spare each of you smoke equal to 20.2 cigarettes a week.',
    );
    await userEvent.click(screen.getByRole('tab', { name: 'Greener choices' }));
    await userEvent.click(
      screen.getByRole('button', { name: 'I’ll do this', description: /to the metro/ }),
    );
    expect(impact).toHaveTextContent('2 steps chosen.');
    expect(impact).toHaveTextContent('They save 10.9 kg of CO₂ a week.');
    unmount();
    render(<Dashboard />);
    expect(await screen.findByRole('region', { name: 'Your choices' })).toHaveTextContent(
      '2 steps chosen.',
    );
  });

  it('shows CO₂ alone when only a travel switch is chosen, and one person in the summary', async () => {
    mockApi();
    saveProfile(makeProfile({ members: makeProfile().members.slice(0, 1) }));
    localStorage.setItem('bw-choices-v1', JSON.stringify(['commute-metro']));
    render(<Dashboard />);
    expect(await screen.findByText('Delhi, 1 person')).toBeInTheDocument();
    const impact = screen.getByRole('region', { name: 'Your choices' });
    expect(impact).toHaveTextContent('1 step chosen. They save 10.9 kg of CO₂ a week.');
    expect(impact).not.toHaveTextContent('cigarette');
  });

  it('asks Gemini again when the first briefing came from the engine', async () => {
    const plan = vi
      .fn()
      .mockReturnValueOnce(
        Response.json({
          source: 'engine',
          briefing: { headline: 'Engine headline', summary: 'Engine summary.', explanations: [] },
        }),
      )
      .mockReturnValueOnce(Response.json(aiPlan));
    mockApi({ plan });
    await openDashboard();
    await userEvent.click(await screen.findByRole('button', { name: 'Ask Gemini again' }));
    expect(
      await screen.findByRole('heading', { name: aiPlan.briefing.headline }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ask Gemini again' })).not.toBeInTheDocument();
  });

  it('opens the method with every source', async () => {
    mockApi();
    await openDashboard();
    await userEvent.click(screen.getByText('How we calculate'));
    expect(screen.getByRole('link', { name: /Guide to Air Cleaners/ })).toHaveAttribute(
      'rel',
      'noreferrer',
    );
  });
});
