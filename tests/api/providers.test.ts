import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cascadeFrom, providersFrom } from '../../api/_lib/ai/config';
import { geminiProviders } from '../../api/_lib/ai/gemini';
import { compatibleProvider } from '../../api/_lib/ai/openai-compatible';
import type { AiRequest } from '../../api/_lib/ai/provider';

const generateContent = vi.fn();
vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    models = { generateContent };
  },
}));

const plain: AiRequest = { system: 'sys', prompt: 'hello', schema: null, maxOutputTokens: 50 };
const json: AiRequest = { ...plain, schema: { type: 'object' } };
const signal = new AbortController().signal;

beforeEach(() => {
  generateContent.mockReset();
});

describe('geminiProviders', () => {
  it('creates one provider per model and requests JSON when a schema is given', async () => {
    generateContent.mockResolvedValue({ text: ' {"a":1} ' });
    const [flash, lite] = geminiProviders('key', ['flash', 'lite']);
    expect(lite?.name).toBe('lite');
    expect(await flash?.generate(json, signal)).toBe('{"a":1}');
    expect(generateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'flash',
        contents: 'hello',
        config: expect.objectContaining({
          responseMimeType: 'application/json',
          responseJsonSchema: { type: 'object' },
        }),
      }),
    );
  });

  it('asks for plain text without a schema and rejects empty replies', async () => {
    generateContent
      .mockResolvedValueOnce({ text: 'hi' })
      .mockResolvedValueOnce({ text: undefined });
    const [flash] = geminiProviders('key', ['flash']);
    expect(await flash?.generate(plain, signal)).toBe('hi');
    expect(generateContent.mock.calls[0]?.[0].config).not.toHaveProperty('responseMimeType');
    await expect(flash?.generate(plain, signal)).rejects.toMatchObject({ status: 502 });
  });
});

describe('compatibleProvider', () => {
  const provider = compatibleProvider({ baseUrl: 'https://llm.test/v1/', apiKey: 'k', model: 'm' });

  it('posts an OpenAI-style chat request and returns the reply', async () => {
    const fetch = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(Response.json({ choices: [{ message: { content: ' answer ' } }] }));
    expect(await provider.generate(json, signal)).toBe('answer');
    const [url, init] = fetch.mock.calls[0]!;
    expect(url).toBe('https://llm.test/v1/chat/completions');
    expect(JSON.parse(init?.body as string)).toMatchObject({
      model: 'm',
      response_format: { type: 'json_object' },
    });
  });

  it('reports rate limits with their Retry-After and rejects empty replies', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response('', { status: 429, headers: { 'retry-after': '3' } }))
      .mockResolvedValueOnce(new Response('', { status: 500 }))
      .mockResolvedValueOnce(Response.json({ choices: [{ message: { content: null } }] }));
    await expect(provider.generate(plain, signal)).rejects.toMatchObject({
      status: 429,
      retryAfterMs: 3000,
    });
    await expect(provider.generate(plain, signal)).rejects.toMatchObject({
      status: 500,
      retryAfterMs: null,
    });
    await expect(provider.generate(plain, signal)).rejects.toMatchObject({ status: 502 });
  });
});

describe('providersFrom', () => {
  it('runs on the engine alone with no keys', () => {
    expect(providersFrom({})).toEqual([]);
    expect(providersFrom({ GEMINI_API_KEY: '', FALLBACK_AI_URL: '' })).toEqual([]);
  });

  it('orders Gemini models first, then the optional fallback provider', () => {
    const names = providersFrom({
      GEMINI_API_KEY: 'g',
      GEMINI_MODELS: 'a, b,,',
      FALLBACK_AI_URL: 'https://llm.test',
      FALLBACK_AI_KEY: 'k',
      FALLBACK_AI_MODEL: 'c',
    }).map((provider) => provider.name);
    expect(names).toEqual(['a', 'b', 'c']);
    expect(providersFrom({ GEMINI_API_KEY: 'g' }).map((provider) => provider.name)).toEqual([
      'gemini-3.5-flash',
      'gemini-3.5-flash-lite',
    ]);
  });

  it('validates the daily budget', () => {
    expect(() => cascadeFrom({ AI_DAILY_BUDGET: '-1' })).toThrow();
    expect(cascadeFrom({ AI_DAILY_BUDGET: '' })).toBeDefined();
  });
});
