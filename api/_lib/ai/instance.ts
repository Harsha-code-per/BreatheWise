/**
 * The process-wide AI service, created on first use so cold starts without an AI key stay cheap.
 */
import { cascadeFrom } from './config.js';
import { createAiService, type AiService } from './service.js';

let service: AiService | null = null;

/** Returns the shared AI service built from environment variables. */
export function aiService(): AiService {
  service ??= createAiService(cascadeFrom(process.env));
  return service;
}
