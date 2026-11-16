import { type ReactElement, useState, type SubmitEvent } from 'react';
import type { Language, Profile } from '../domain/schemas.js';
import { api, RequestFailed } from '../lib/api.js';
import styles from './dashboard.module.css';

interface Message {
  id: number;
  role: 'you' | 'breathewise';
  text: string;
  note?: string;
  lang?: Language;
}

const SUGGESTIONS = [
  'When is it safe for the kids to play outside?',
  'Should I open the windows today?',
  'Which mask actually works?',
];

/** A short conversation about the family's air, answered from their own forecast. */
export function AskPanel({ profile }: { profile: Profile }): ReactElement {
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState('');
  const [busy, setBusy] = useState(false);

  const ask = async (text: string) => {
    const trimmed = text.trim();
    if (trimmed.length < 2 || busy) return;
    setBusy(true);
    setQuestion('');
    setMessages((list) => [...list, { id: list.length, role: 'you', text: trimmed }]);
    const reply = await api.ask(profile, trimmed).then(
      (response) => ({
        text: response.answer,
        ...(response.source === 'ai' ? { lang: profile.language } : {}),
        note: response.source === 'ai' ? 'Answered by Gemini' : 'Answered by BreatheWise',
      }),
      (error: unknown) => ({
        text: error instanceof RequestFailed ? error.message : 'Something went wrong.',
        note: 'Not answered',
      }),
    );
    setMessages((list) => [...list, { id: list.length, role: 'breathewise', ...reply }]);
    setBusy(false);
  };
  const submit = (event: SubmitEvent) => {
    event.preventDefault();
    void ask(question);
  };

  return (
    <div className={styles['ask']}>
      <div role="log" aria-label="Conversation" className={styles['log']}>
        {messages.length === 0 ? (
          <p className="hint">Ask anything about today’s air and your family’s plan.</p>
        ) : null}
        {messages.map((message) => (
          <div key={message.id} className={styles['message']} data-role={message.role}>
            <p lang={message.lang}>{message.text}</p>
            {message.note ? <span className="hint">{message.note}</span> : null}
          </div>
        ))}
        {busy ? <p className="hint">Thinking…</p> : null}
      </div>
      <div className={styles['suggestions']}>
        {SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            className="button button-quiet"
            onClick={() => void ask(suggestion)}
            disabled={busy}
          >
            {suggestion}
          </button>
        ))}
      </div>
      <form className={styles['askForm']} onSubmit={submit}>
        <label htmlFor="ask-input" className="visually-hidden">
          Your question
        </label>
        <input
          id="ask-input"
          value={question}
          maxLength={400}
          onChange={(event) => {
            setQuestion(event.target.value);
          }}
          placeholder="Can Nani go for her evening walk?"
          autoComplete="off"
        />
        <button type="submit" className="button" disabled={busy}>
          Ask
        </button>
      </form>
    </div>
  );
}
