/**
 * Google Gemini providers (one per model) via the official @google/genai SDK.
 */
import { GoogleGenAI } from '@google/genai';
import {
  HTTP_STATUS,
  ProviderError,
  TEMPERATURE,
  type AiRequest,
  type Provider,
} from './provider.js';

/** Creates one provider per Gemini model, sharing a single client. */
export function geminiProviders(apiKey: string, models: readonly string[]): Provider[] {
  const client = new GoogleGenAI({ apiKey });
  return models.map((model) => ({
    name: model,
    async generate(request: AiRequest, signal: AbortSignal): Promise<string> {
      const json = request.schema
        ? { responseMimeType: 'application/json', responseJsonSchema: request.schema }
        : {};
      const response = await client.models.generateContent({
        model,
        contents: request.prompt,
        config: {
          systemInstruction: request.system,
          maxOutputTokens: request.maxOutputTokens,
          temperature: TEMPERATURE,
          abortSignal: signal,
          ...json,
        },
      });
      const text = response.text?.trim();
      if (!text) throw new ProviderError(HTTP_STATUS.badGateway);
      return text;
    },
  }));
}
