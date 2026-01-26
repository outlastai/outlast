/**
 * Copyright (C) 2026 by Outlast. MIT License.
 *
 * Tool executor factory.
 */
import type { ToolResult, ToolExecutor } from "../types.js";
import type { ToolExecutorDependencies, ToolHandler } from "./types.js";
import { handleSendEmail } from "./handleSendEmail.js";
import { handleSendCall } from "./handleSendCall.js";
import { handleGetRecord } from "./handleGetRecord.js";
import { handleGetRecordHistory } from "./handleGetRecordHistory.js";
import { handleUpdateRecordStatus } from "./handleUpdateRecordStatus.js";

export type { ToolExecutorDependencies, ToolHandler } from "./types.js";

/**
 * Create a tool executor with the given dependencies.
 */
export function createToolExecutor(deps: ToolExecutorDependencies): ToolExecutor {
  const handlers: Record<string, ToolHandler> = {
    sendEmail: handleSendEmail,
    sendCall: handleSendCall,
    getRecord: handleGetRecord,
    getRecordHistory: handleGetRecordHistory,
    updateRecordStatus: handleUpdateRecordStatus
  };

  return async function executeTool(
    toolName: string,
    args: Record<string, unknown>,
    context?: Record<string, unknown>
  ): Promise<ToolResult> {
    const handler = handlers[toolName];

    if (!handler) {
      return { success: false, message: `Unknown tool: ${toolName}` };
    }

    try {
      return await handler(deps, args, context);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, message: `Tool error: ${message}` };
    }
  };
}
