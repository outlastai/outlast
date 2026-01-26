/**
 * Copyright (C) 2026 by Outlast. MIT License.
 */
export { staticPreCheck } from "./staticPreCheck.js";
export { buildAnalysisContext } from "./buildAnalysisContext.js";
export { calculateDaysSince } from "./calculateDaysSince.js";
export {
  ACTION_CHANNELS,
  type ActionChannel,
  type RecordStatus,
  type PriorityLevel,
  type RecordAnalysisContext,
  type StaticRules,
  type StaticPreCheckResult,
  type CheckResult
} from "./types.js";
export {
  checkMaxAttempts,
  checkTooSoon,
  checkRecordTooRecent,
  checkRecentlyUpdated,
  checkHighPriority,
  checkLowPriority,
  checkFirstAction
} from "./checks/index.js";
