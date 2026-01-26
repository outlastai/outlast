/**
 * Copyright (C) 2026 by Outlast. MIT License.
 */
import type { CheckResult } from "../types.js";

/**
 * Check if too little time has passed since the last action.
 * @returns Result to skip, or null to continue to next check.
 */
export function checkTooSoon(
  daysSinceLastAction: number,
  minDaysBetweenActions: number
): CheckResult {
  if (daysSinceLastAction < minDaysBetweenActions) {
    return { shouldProceed: false, reason: "TOO_SOON" };
  }
  return null;
}
