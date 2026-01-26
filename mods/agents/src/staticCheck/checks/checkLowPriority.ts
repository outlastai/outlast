/**
 * Copyright (C) 2026 by Outlast. MIT License.
 */
import type { CheckResult, PriorityLevel } from "../types.js";

/**
 * Check if low priority record needs more time.
 * Low priority records wait longer between actions.
 * @returns Result to skip, or null to continue to next check.
 */
export function checkLowPriority(
  priority: PriorityLevel | null,
  daysSinceLastAction: number,
  minDaysBetweenActions: number,
  lowPriorityMultiplier: number
): CheckResult {
  if (priority === "LOW") {
    const requiredDays = minDaysBetweenActions * lowPriorityMultiplier;
    if (daysSinceLastAction < requiredDays) {
      return { shouldProceed: false, reason: "LOW_PRIORITY_TOO_SOON" };
    }
  }
  return null;
}
