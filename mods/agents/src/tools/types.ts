/**
 * Copyright (C) 2026 by Outlast. MIT License.
 *
 * Types for LLM tool calling.
 */

/**
 * OpenAI function tool definition.
 */
export interface ToolFunction {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<
        string,
        {
          type: string;
          description: string;
          enum?: string[];
        }
      >;
      required: string[];
    };
  };
}

/**
 * Result from executing a tool.
 */
export interface ToolResult {
  success: boolean;
  message: string;
  data?: unknown;
}

/**
 * Tool executor function type.
 */
export type ToolExecutor = (
  toolName: string,
  args: Record<string, unknown>,
  context?: Record<string, unknown>
) => Promise<ToolResult>;
