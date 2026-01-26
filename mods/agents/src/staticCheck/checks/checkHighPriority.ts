/**
 * Copyright (C) 2026 by Outlast.
 */
import type { CheckResult, PriorityLevel } from "../types.js";

/**
 * Check if high priority record is ready for action.
 * High priority records get expedited handling.
 * @returns Result to proceed, or null to continue to next check.
 */
export function checkHighPriority(
  priority: PriorityLevel | null,
  daysSinceLastAction: number,
  highPriorityMinDays: number
): CheckResult {
  if (priority === "HIGH" && daysSinceLastAction >= highPriorityMinDays) {
    return { shouldProceed: true, reason: "HIGH_PRIORITY_READY" };
  }
  return null;
}
