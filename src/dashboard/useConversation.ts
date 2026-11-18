/**
 * The Ask tab's conversation: each question goes to the API with the family's profile, and
 * the reply records who answered it, Gemini or the engine.
 */
import { useState } from 'react';
import type { AskResponse, Language, Profile } from '../domain/schemas.js';
import { api, RequestFailed } from '../lib/api.js';

/** One line of the conversation. */
interface Message {
  id: number;
  role: 'you' | 'breathewise';
  text: string;
  note?: string;
  lang?: Language;
}

type Reply = Omit<Message, 'id' | 'role'>;

/** Questions shorter than this are ignored rather than sent. */
const MIN_QUESTION_LENGTH = 2;

/** The messages so far, whether a reply is pending, and a way to ask. */
export interface Conversation {
  messages: readonly Message[];
  busy: boolean;
  /** Sends the question unless it is too short or a reply is pending; returns whether it was sent. */
  ask: (text: string) => boolean;
}

function replyFrom(response: AskResponse, language: Language): Reply {
  return response.source === 'ai'
    ? { text: response.answer, lang: language, note: 'Answered by Gemini' }
    : { text: response.answer, note: 'Answered by BreatheWise' };
}

function failureReply(error: unknown): Reply {
  return {
    text: error instanceof RequestFailed ? error.message : 'Something went wrong.',
    note: 'Not answered',
  };
}

/** Holds the conversation and sends one question at a time. */
export function useConversation(profile: Profile): Conversation {
  const [messages, setMessages] = useState<Message[]>([]);
  const [busy, setBusy] = useState(false);
  const add = (role: Message['role'], reply: Reply) => {
    setMessages((list) => [...list, { id: list.length, role, ...reply }]);
  };

  const send = async (question: string) => {
    setBusy(true);
    add('you', { text: question });
    const reply = await api
      .ask(profile, question)
      .then((response) => replyFrom(response, profile.language), failureReply);
    add('breathewise', reply);
    setBusy(false);
  };
  const ask = (text: string) => {
    const question = text.trim();
    if (question.length < MIN_QUESTION_LENGTH || busy) return false;
    void send(question);
    return true;
  };

  return { messages, busy, ask };
}
