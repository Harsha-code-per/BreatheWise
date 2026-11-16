import { useState, type ReactElement } from 'react';
import type { Intake } from '../domain/schemas.js';
import { api, RequestFailed } from '../lib/api.js';
import styles from './setup.module.css';

/** Lets the family describe itself in a sentence; Gemini fills in the form below. */
export function IntakeField({
  onRead,
}: {
  onRead: (intake: Intake) => Promise<void>;
}): ReactElement {
  const [text, setText] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  const read = async () => {
    if (text.trim().length < 3) {
      setStatus('Write a sentence or two about your family first.');
      return;
    }
    setBusy(true);
    setStatus('Gemini is reading your description…');
    try {
      await onRead(await api.intake(text.trim()));
      setStatus('Filled in from your description. Check the details below, then show your plan.');
    } catch (error) {
      setStatus(
        error instanceof RequestFailed
          ? error.message
          : 'Something went wrong. Fill in the form below.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={styles['intake']} aria-labelledby="intake-title">
      <h2 id="intake-title">Describe your family</h2>
      <p className="hint" id="intake-hint">
        Write it the way you would tell a friend. Gemini fills in the form below, and you can check
        every detail.
      </p>
      <label htmlFor="intake-text" className="visually-hidden">
        Your family in your own words
      </label>
      <textarea
        id="intake-text"
        rows={3}
        maxLength={600}
        value={text}
        aria-describedby="intake-hint"
        placeholder="We are four in Pune. My mother is 70 and my son has asthma. I drive 12 km to work at 9."
        onChange={(event) => {
          setText(event.target.value);
        }}
      />
      <div className={styles['intakeActions']}>
        <button type="button" className="button" onClick={() => void read()} disabled={busy}>
          Fill in the form for me
        </button>
        <p role="status" className="hint">
          {status}
        </p>
      </div>
    </section>
  );
}
