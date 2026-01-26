/**
 * Copyright (C) 2026 by Outlast. MIT License.
 */
import type { CheckResult } from "../types.js";

/**
 * Check if max action attempts has been reached.
 * @returns Result to skip, or null to continue to next check.
 */
export function checkMaxAttempts(actionCount: number, maxAttempts: number): CheckResult {
  if (actionCount >= maxAttempts) {
    return { shouldProceed: false, reason: "MAX_ATTEMPTS_REACHED" };
  }
  return null;
}
