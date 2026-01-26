/**
 * Copyright (C) 2026 by Outlast. MIT License.
 */
import type { ToolResult } from "../types.js";
import type { ToolExecutorDependencies } from "./types.js";

/**
 * Handle getRecord tool call.
 */
export async function handleGetRecord(
  deps: ToolExecutorDependencies,
  args: Record<string, unknown>
): Promise<ToolResult> {
  const recordId = args.recordId as string;

  const record = await deps.getRecord(recordId);
  if (!record) {
    return { success: false, message: `Record not found: ${recordId}` };
  }

  return {
    success: true,
    message: "Record retrieved",
    data: record
  };
}
