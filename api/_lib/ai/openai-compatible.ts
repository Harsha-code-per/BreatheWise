/**
 * Optional second provider for any OpenAI-compatible chat API (for example a free Groq key).
 * Uses plain fetch, so it adds no dependency.
 */
import { z } from 'zod';
import { ProviderError, type AiRequest, type Provider } from './provider.js';

const completion = z.object({
  choices: z.array(z.object({ message: z.object({ content: z.string().nullable() }) })).min(1),
});

/** Where and how to reach the OpenAI-compatible endpoint. */
export interface CompatibleConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

/** Creates a provider that calls `<baseUrl>/chat/completions`. */
export function compatibleProvider(config: CompatibleConfig): Provider {
  return {
    name: config.model,
    async generate(request: AiRequest, signal: AbortSignal): Promise<string> {
      const response = await fetch(`${config.baseUrl.replace(/\/$/, '')}/chat/completions`, {
        method: 'POST',
        signal,
        headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: config.model,
          max_tokens: request.maxOutputTokens,
          temperature: 0.4,
          messages: [
            { role: 'system', content: request.system },
            { role: 'user', content: request.prompt },
          ],
          ...(request.schema ? { response_format: { type: 'json_object' } } : {}),
        }),
      });
      if (!response.ok) {
        const retryAfter = Number(response.headers.get('retry-after'));
        throw new ProviderError(response.status, retryAfter > 0 ? retryAfter * 1000 : null);
      }
      const text = completion.parse(await response.json()).choices[0]?.message.content?.trim();
      if (!text) throw new ProviderError(502);
      return text;
    },
  };
}
