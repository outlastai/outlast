/**
 * Copyright (C) 2026 by Outlast. MIT License.
 */
import type { CheckResult } from "../types.js";

/**
 * Check if the record was created too recently.
 * @returns Result to skip, or null to continue to next check.
 */
export function checkRecordTooRecent(
  daysSinceCreation: number,
  recordTooRecentDays: number
): CheckResult {
  if (daysSinceCreation < recordTooRecentDays) {
    return { shouldProceed: false, reason: "RECORD_TOO_RECENT" };
  }
  return null;
}
