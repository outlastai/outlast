/**
 * Copyright (C) 2026 by Outlast.
 *
 * LLM judge for response similarity and argument matching.
 */
import OpenAI from "openai";

const CONFIDENCE_THRESHOLD = 0.7;

/**
 * Result from similarity test.
 */
export interface SimilarityResult {
  similar: boolean;
  confidence: number;
  reason: string;
}

/**
 * Test if two responses are semantically similar using LLM judge.
 */
export async function similarityTest(
  expected: string,
  actual: string,
  options: { apiKey: string; model?: string } = { apiKey: "" }
): Promise<SimilarityResult> {
  const client = new OpenAI({ apiKey: options.apiKey || process.env.OPENAI_API_KEY });
  const model = options.model ?? "gpt-4o-mini";

  const systemPrompt = `You are an evaluation judge for AI agent responses. Determine if two responses are semantically equivalent (same meaning and intent, wording may differ).

Respond with JSON only: { "similar": boolean, "confidence": number 0-1, "reason": string }`;

  const userPrompt = `Expected:\n${expected}\n\nActual:\n${actual}\n\nAre these semantically equivalent?`;

  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    response_format: { type: "json_object" },
    temperature: 0.1
  });

  const content = response.choices[0].message.content;
  if (!content) {
    return { similar: false, confidence: 0, reason: "Judge returned empty response" };
  }

  const parsed = JSON.parse(content) as { similar?: boolean; confidence?: number; reason?: string };
  const confidence = Math.max(0, Math.min(1, Number(parsed.confidence) ?? 0));
  return {
    similar: Boolean(parsed.similar) && confidence >= CONFIDENCE_THRESHOLD,
    confidence,
    reason: parsed.reason ?? "No reason provided"
  };
}

/**
 * Compare expected vs actual tool arguments using LLM judge (semantic match).
 */
export async function compareArgs(
  expected: Record<string, unknown>,
  actual: Record<string, unknown>,
  options: { apiKey: string; model?: string } = { apiKey: "" }
): Promise<{ match: boolean; reason: string }> {
  const client = new OpenAI({ apiKey: options.apiKey || process.env.OPENAI_API_KEY });
  const model = options.model ?? "gpt-4o-mini";

  const systemPrompt = `You are an evaluation judge for function arguments. Determine if the EXPECTED arguments are present and match in the ACTUAL arguments. Ignore extra keys in actual. Values are equivalent if they represent the same thing.

Respond with JSON only: { "match": boolean, "reason": string }`;

  const userPrompt = `Expected:\n${JSON.stringify(expected, null, 2)}\n\nActual:\n${JSON.stringify(actual, null, 2)}`;

  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    response_format: { type: "json_object" },
    temperature: 0.1
  });

  const content = response.choices[0].message.content;
  if (!content) {
    return { match: false, reason: "Judge returned empty response" };
  }

  const parsed = JSON.parse(content) as { match?: boolean; reason?: string };
  return {
    match: Boolean(parsed.match),
    reason: parsed.reason ?? "No reason provided"
  };
}
