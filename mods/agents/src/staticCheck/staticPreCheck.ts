/**
 * Copyright (C) 2026 by Outlast. MIT License.
 *
 * Static pre-check orchestrator.
 * Runs checks in order to determine if AI should be invoked.
 */
import type { RecordAnalysisContext, StaticRules, StaticPreCheckResult } from "./types.js";
import {
  checkMaxAttempts,
  checkTooSoon,
  checkRecordTooRecent,
  checkRecentlyUpdated,
  checkHighPriority,
  checkLowPriority,
  checkFirstAction
} from "./checks/index.js";

/**
 * Run static pre-checks on a record to determine if AI should be invoked.
 *
 * Checks are run in order; first non-null result is returned.
 * If all checks return null, proceeds to AI analysis.
 */
export function staticPreCheck(
  context: RecordAnalysisContext,
  rules: StaticRules
): StaticPreCheckResult {
  const { actionCount, daysSinceLastAction, daysSinceLastUpdate, daysSinceCreation } = context;
  const { priority } = context.record;

  // Check 1: Max attempts reached
  const maxResult = checkMaxAttempts(actionCount, rules.maxActionAttempts);
  if (maxResult) return maxResult;

  // Check 2: Too soon since last action
  const soonResult = checkTooSoon(daysSinceLastAction, rules.minDaysBetweenActions);
  if (soonResult) return soonResult;

  // Check 3: Record too recent
  const recentResult = checkRecordTooRecent(daysSinceCreation, rules.recordTooRecentDays);
  if (recentResult) return recentResult;

  // Check 4: Recently updated
  const updatedResult = checkRecentlyUpdated(daysSinceLastUpdate, rules.recentUpdateCooldownDays);
  if (updatedResult) return updatedResult;

  // Check 5: High priority ready
  const highResult = checkHighPriority(priority, daysSinceLastAction, rules.highPriorityMinDays);
  if (highResult) return highResult;

  // Check 6: Low priority too soon
  const lowResult = checkLowPriority(
    priority,
    daysSinceLastAction,
    rules.minDaysBetweenActions,
    rules.lowPriorityMultiplier
  );
  if (lowResult) return lowResult;

  // Check 7: First action candidate
  const firstResult = checkFirstAction(actionCount, daysSinceCreation, rules.minDaysBetweenActions);
  if (firstResult) return firstResult;

  // Default: Proceed to AI analysis
  return { shouldProceed: true, reason: "NEEDS_AI_ANALYSIS" };
}
