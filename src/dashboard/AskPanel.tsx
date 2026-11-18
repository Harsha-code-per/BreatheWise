import { type ReactElement, useState, type SubmitEvent } from 'react';
import type { Profile } from '../domain/schemas.js';
import styles from './dashboard.module.css';
import { type Conversation, useConversation } from './useConversation.js';

const SUGGESTIONS = [
  'When is it safe for the kids to play outside?',
  'Should I open the windows today?',
  'Which mask actually works?',
];

/** The conversation so far, announced as it grows. */
function MessageLog({
  messages,
  busy,
}: {
  messages: Conversation['messages'];
  busy: boolean;
}): ReactElement {
  return (
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
  );
}

/** One-tap starter questions. */
function Suggestions({
  disabled,
  onPick,
}: {
  disabled: boolean;
  onPick: (question: string) => void;
}): ReactElement {
  return (
    <div className={styles['suggestions']}>
      {SUGGESTIONS.map((suggestion) => (
        <button
          key={suggestion}
          type="button"
          className="button button-quiet"
          onClick={() => {
            onPick(suggestion);
          }}
          disabled={disabled}
        >
          {suggestion}
        </button>
      ))}
    </div>
  );
}

/** A short conversation about the family's air, answered from their own forecast. */
export function AskPanel({ profile }: { profile: Profile }): ReactElement {
  const { messages, busy, ask } = useConversation(profile);
  const [question, setQuestion] = useState('');
  const send = (text: string) => {
    if (ask(text)) setQuestion('');
  };
  const submit = (event: SubmitEvent) => {
    event.preventDefault();
    send(question);
  };

  return (
    <div className={styles['ask']}>
      <MessageLog messages={messages} busy={busy} />
      <Suggestions disabled={busy} onPick={send} />
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
