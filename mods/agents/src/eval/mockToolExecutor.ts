/**
 * Copyright (C) 2026 by Outlast.
 *
 * Mock tool executor for eval: records calls and returns predefined responses.
 */
import type { ToolExecutor } from "../tools/types.js";
import type { EvalScenario } from "@outlast/common";

/**
 * Record of a tool call made during evaluation.
 */
export interface ToolCallRecord {
  name: string;
  args: Record<string, unknown>;
  timestamp: number;
}

/**
 * Create a mock tool executor from scenario mockTools.
 * Records all calls for verification.
 */
export function createMockToolExecutor(mockTools: EvalScenario["mockTools"] = {}): {
  executor: ToolExecutor;
  getCalls: () => ToolCallRecord[];
  getCallsByName: (name: string) => ToolCallRecord[];
} {
  const calls: ToolCallRecord[] = [];

  const executor: ToolExecutor = async (toolName, args) => {
    const timestamp = Date.now();
    calls.push({ name: toolName, args, timestamp });

    const config = mockTools[toolName];
    if (!config?.response) {
      return { success: true, message: `Mock response for ${toolName}` };
    }
    const response = config.response as {
      success?: boolean;
      message?: string;
      [k: string]: unknown;
    };
    return {
      success: response.success ?? true,
      message: response.message ?? "OK",
      ...response
    };
  };

  return {
    executor,
    getCalls: () => [...calls],
    getCallsByName: (name: string) => calls.filter((c) => c.name === name)
  };
}
