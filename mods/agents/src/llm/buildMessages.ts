/**
 * Copyright (C) 2026 by Outlast. MIT License.
 *
 * Build message arrays for LLM calls.
 */
import type { Message, MessageContentItem } from "./types.js";

/**
 * Build full message array with system prompt and user message.
 * @param systemPrompt - The system prompt
 * @param history - Previous conversation messages
 * @param userMessage - Current user message
 * @returns Full message array ready for LLM
 */
export function buildMessages(
  systemPrompt: string,
  history: Message[],
  userMessage: string
): Message[] {
  const messages: Message[] = [{ role: "system", content: systemPrompt }, ...history];

  const userContent: MessageContentItem[] = [{ type: "text", text: userMessage }];
  messages.push({ role: "user", content: userContent });

  return messages;
}

/**
 * Add assistant message with tool calls to conversation.
 */
export function addAssistantToolCalls(
  messages: Message[],
  content: string | null,
  toolCalls: Array<{ id: string; type: "function"; function: { name: string; arguments: string } }>
): Message[] {
  return [
    ...messages,
    {
      role: "assistant" as const,
      content: content || "",
      tool_calls: toolCalls
    }
  ];
}

/**
 * Add tool result message to conversation.
 */
export function addToolResult(
  messages: Message[],
  toolName: string,
  toolCallId: string,
  result: string
): Message[] {
  return [
    ...messages,
    {
      role: "tool" as const,
      content: result,
      name: toolName,
      tool_call_id: toolCallId
    }
  ];
}
