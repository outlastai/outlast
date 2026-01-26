/**
 * Copyright (C) 2026 by Outlast. MIT License.
 */
import type { CheckResult } from "../types.js";

/**
 * Check if this is a first action candidate.
 * Records with no previous actions that have aged enough should proceed.
 * @returns Result to proceed, or null to continue to next check.
 */
export function checkFirstAction(
  actionCount: number,
  daysSinceCreation: number,
  minDaysBetweenActions: number
): CheckResult {
  if (actionCount === 0 && daysSinceCreation >= minDaysBetweenActions) {
    return { shouldProceed: true, reason: "FIRST_ACTION_CANDIDATE" };
  }
  return null;
}
