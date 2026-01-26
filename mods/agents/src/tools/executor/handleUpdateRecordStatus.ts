/**
 * Copyright (C) 2026 by Outlast. MIT License.
 */
import type { ToolResult } from "../types.js";
import type { ToolExecutorDependencies } from "./types.js";

/**
 * Handle updateRecordStatus tool call.
 */
export async function handleUpdateRecordStatus(
  deps: ToolExecutorDependencies,
  args: Record<string, unknown>
): Promise<ToolResult> {
  const recordId = args.recordId as string;
  const status = args.status as string;

  const result = await deps.updateRecordStatus(recordId, status);

  return {
    success: true,
    message: `Record status updated to ${status}`,
    data: { id: result.id, status }
  };
}
