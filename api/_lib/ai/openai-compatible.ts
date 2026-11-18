/**
 * Optional second provider for any OpenAI-compatible chat API (for example a free Groq key).
 * Uses plain fetch, so it adds no dependency.
 */
import { z } from 'zod';
import { MS_PER_SECOND } from '../../../src/domain/units.js';
import {
  HTTP_STATUS,
  ProviderError,
  TEMPERATURE,
  type AiRequest,
  type Provider,
} from './provider.js';

const completion = z.object({
  choices: z.array(z.object({ message: z.object({ content: z.string().nullable() }) })).min(1),
});

/** Where and how to reach the OpenAI-compatible endpoint. */
export interface CompatibleConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

/** The chat-completions body for one request; JSON mode when a schema is asked for. */
function requestBody(model: string, request: AiRequest): string {
  return JSON.stringify({
    model,
    max_tokens: request.maxOutputTokens,
    temperature: TEMPERATURE,
    messages: [
      { role: 'system', content: request.system },
      { role: 'user', content: request.prompt },
    ],
    ...(request.schema ? { response_format: { type: 'json_object' } } : {}),
  });
}

/** A failed response as a ProviderError, keeping any Retry-After hint. */
function failure(response: Response): ProviderError {
  const retryAfter = Number(response.headers.get('retry-after'));
  return new ProviderError(response.status, retryAfter > 0 ? retryAfter * MS_PER_SECOND : null);
}

/** Creates a provider that calls `<baseUrl>/chat/completions`. */
export function compatibleProvider(config: CompatibleConfig): Provider {
  const url = `${config.baseUrl.replace(/\/$/, '')}/chat/completions`;
  const headers = { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' };
  return {
    name: config.model,
    async generate(request: AiRequest, signal: AbortSignal): Promise<string> {
      const body = requestBody(config.model, request);
      const response = await fetch(url, { method: 'POST', signal, headers, body });
      if (!response.ok) throw failure(response);
      const text = completion.parse(await response.json()).choices[0]?.message.content?.trim();
      if (!text) throw new ProviderError(HTTP_STATUS.badGateway);
      return text;
    },
  };
}
