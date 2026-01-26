/**
 * Copyright (C) 2026 by Outlast. MIT License.
 */
import type { CheckResult } from "../types.js";

/**
 * Check if the record was updated too recently.
 * @returns Result to skip, or null to continue to next check.
 */
export function checkRecentlyUpdated(
  daysSinceLastUpdate: number,
  recentUpdateCooldownDays: number
): CheckResult {
  if (daysSinceLastUpdate < recentUpdateCooldownDays) {
    return { shouldProceed: false, reason: "RECENTLY_UPDATED" };
  }
  return null;
}
