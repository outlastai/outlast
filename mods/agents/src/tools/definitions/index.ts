/**
 * Copyright (C) 2026 by Outlast. MIT License.
 */
import type { ToolFunction } from "../types.js";
import { sendEmailTool } from "./sendEmail.js";
import { sendCallTool } from "./sendCall.js";
import { getRecordTool } from "./getRecord.js";
import { getRecordHistoryTool } from "./getRecordHistory.js";
import { updateRecordStatusTool } from "./updateRecordStatus.js";

export { sendEmailTool } from "./sendEmail.js";
export { sendCallTool } from "./sendCall.js";
export { getRecordTool } from "./getRecord.js";
export { getRecordHistoryTool } from "./getRecordHistory.js";
export { updateRecordStatusTool } from "./updateRecordStatus.js";

/**
 * All available tools.
 */
export const allTools: ToolFunction[] = [
  sendEmailTool,
  sendCallTool,
  getRecordTool,
  getRecordHistoryTool,
  updateRecordStatusTool
];

/**
 * Get a tool by name.
 */
export function getToolByName(name: string): ToolFunction | undefined {
  return allTools.find((tool) => tool.function.name === name);
}
