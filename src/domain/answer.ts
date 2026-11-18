/**
 * Offline answers for the "Ask" tab, used when no AI provider is available. It matches the
 * question to topics and replies with the engine's own recommendations for that topic.
 */
import type { Action } from './action.js';
import { allActions, type Analysis } from './analysis.js';

/** A question that matches no topic gets the plan's first few actions. */
const GENERAL_ACTIONS = 3;

interface Topic {
  words: RegExp;
  ids: readonly string[];
  note?: string;
}

/** Checked in order, most specific first. */
const TOPICS: readonly Topic[] = [
  { words: /child|kid|baby|school|son|daughter/i, ids: ['shelter-sensitive', 'walking-bus'] },
  { words: /exercis|run|jog|walk|gym|sport|play/i, ids: ['exercise-window', 'shelter-sensitive'] },
  { words: /window|ventilat|air out|fresh air/i, ids: ['air-out', 'windows-shut'] },
  {
    words: /purifier|filter|indoor|room|home|house/i,
    ids: ['run-purifier', 'diy-filter-box', 'no-incense'],
  },
  { words: /cook|kitchen|stove|gas|fuel/i, ids: ['cleaner-cooking-fuel', 'kitchen-exhaust'] },
  {
    words: /commut|car|bus|metro|cycl|bike|office|travel/i,
    ids: [
      'commute-shift',
      'commute-metro',
      'commute-bus',
      'commute-cycle',
      'commute-walk',
      'commute-carpool',
    ],
  },
  {
    words: /mask|n95|ffp2/i,
    ids: [],
    note: 'A well-fitted N95 or FFP2 mask filters most fine particles outdoors. Cloth and surgical masks do little against smog, and masks are not advised for children under two.',
  },
];

/** Answers a question from the analysis alone. */
export function engineAnswer(analysis: Analysis, question: string): string {
  const actions = allActions(analysis);
  const topic = TOPICS.find((candidate) => candidate.words.test(question));
  const matched = topic
    ? actions.filter((action) => topic.ids.includes(action.id))
    : actions.slice(0, GENERAL_ACTIONS);
  const lines = [
    `Right now the air in ${analysis.placeName} is ${analysis.band.label.toLowerCase()} (AQI ${Math.round(analysis.current.aqi)}).`,
    topic?.note ?? '',
    ...matched.map(describe),
  ];
  return lines.filter(Boolean).join('\n');
}

function describe(action: Action): string {
  return `• ${action.title}. ${action.detail}`;
}
