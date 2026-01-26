/**
 * Copyright (C) 2026 by Outlast. MIT License.
 *
 * Types for LLM integration.
 */

/**
 * Agent configuration from workflow.
 */
export interface Agent {
  name: string;
  systemPrompt: string;
  allowedTools: string[];
  model: string;
  temperature: number;
}

/**
 * Message content item for multimodal messages.
 */
export interface MessageContentItem {
  type: "text" | "image_url";
  text?: string;
  image_url?: { url: string };
}

/**
 * Message in conversation history.
 */
export interface Message {
  role: "system" | "user" | "assistant" | "tool";
  content: string | MessageContentItem[];
  tool_calls?: ToolCall[];
  name?: string;
  tool_call_id?: string;
}

/**
 * Tool call from the LLM.
 */
export interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

/**
 * Function to invoke the LLM.
 */
export type InvokeLLMFn = (
  messages: Message[],
  userMessage: string,
  context?: Record<string, unknown>
) => Promise<string>;
