import { type ReactElement, useState } from 'react';
import type { Action } from '../domain/action.js';

/** Builds the message neighbours receive. */
function shareText(placeName: string, actions: readonly Action[]): string {
  const steps = actions.map((action) => `• ${action.title}`).join('\n');
  return `Our street's smog plan for ${placeName}:\n${steps}\nMade with BreatheWise.`;
}

/** Shares the community plan with the system share sheet, or copies it where that is missing. */
export function SharePlan({
  placeName,
  actions,
}: {
  placeName: string;
  actions: readonly Action[];
}): ReactElement {
  const [status, setStatus] = useState('');
  const share = async () => {
    const text = shareText(placeName, actions);
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({ title: 'Our smog plan', text });
        setStatus('Shared.');
      } else {
        await navigator.clipboard.writeText(text);
        setStatus('Copied. Paste it into your building or school group.');
      }
    } catch {
      setStatus('Sharing was cancelled.');
    }
  };
  return (
    <p>
      <button type="button" className="button" onClick={() => void share()}>
        Share with neighbours
      </button>{' '}
      <span role="status" className="hint">
        {status}
      </span>
    </p>
  );
}
