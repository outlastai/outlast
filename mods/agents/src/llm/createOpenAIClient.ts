/**
 * Copyright (C) 2026 by Outlast. MIT License.
 *
 * Singleton OpenAI client.
 */
import OpenAI from "openai";

let client: OpenAI | null = null;

/**
 * Get or create OpenAI client instance.
 * @param apiKey - OpenAI API key (required on first call)
 */
export function getOpenAIClient(apiKey?: string): OpenAI {
  if (!client) {
    if (!apiKey) {
      throw new Error("OpenAI API key required for first initialization");
    }
    client = new OpenAI({ apiKey });
  }
  return client;
}

/**
 * Reset client (for testing).
 */
export function resetOpenAIClient(): void {
  client = null;
}
