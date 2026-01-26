/**
 * Copyright (C) 2026 by Outlast.
 */
import type { ToolResult } from "../types.js";
import type { ToolExecutorDependencies } from "./types.js";

/**
 * Handle getRecordHistory tool call.
 */
export async function handleGetRecordHistory(
  deps: ToolExecutorDependencies,
  args: Record<string, unknown>
): Promise<ToolResult> {
  const recordId = args.recordId as string;
  const limit = (args.limit as number) || 20;

  const history = await deps.getRecordHistory(recordId, limit);

  return {
    success: true,
    message: `Retrieved ${history.length} history entries`,
    data: history
  };
}
