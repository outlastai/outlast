/**
 * Copyright (C) 2026 by Outlast.
 *
 * Filter tools by allowed list.
 */
import type { ToolFunction } from "../tools/types.js";

/**
 * Filter tools to only include those in the allowed list.
 * @param allTools - All available tool definitions
 * @param allowedTools - Names of tools to include
 * @returns Filtered list of tool definitions
 */
export function filterTools(allTools: ToolFunction[], allowedTools: string[]): ToolFunction[] {
  const toolMap = new Map(allTools.map((tool) => [tool.function.name, tool]));
  return allowedTools
    .map((name) => toolMap.get(name))
    .filter((tool): tool is ToolFunction => tool !== undefined);
}
