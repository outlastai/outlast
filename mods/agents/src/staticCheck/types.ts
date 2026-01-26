/**
 * Copyright (C) 2026 by Outlast. MIT License.
 *
 * Types for static pre-check system.
 */

/**
 * Channels that count as "actions" for timing purposes.
 * Only outbound communications affect daysSinceLastAction.
 */
export const ACTION_CHANNELS = ["EMAIL", "PHONE", "SMS", "WHATSAPP"] as const;
export type ActionChannel = (typeof ACTION_CHANNELS)[number];

/**
 * Record status values.
 */
export type RecordStatus = "OPEN" | "DONE" | "BLOCKED" | "ARCHIVED";

/**
 * Priority level values.
 */
export type PriorityLevel = "LOW" | "MEDIUM" | "HIGH";

/**
 * Context built from a record and its action history.
 * Used by static check functions to make decisions.
 */
export interface RecordAnalysisContext {
  record: {
    id: string;
    status: RecordStatus;
    priority: PriorityLevel | null;
    createdAt: Date;
    updatedAt: Date;
  };
  /** Count of outbound actions (filtered by ACTION_CHANNELS) */
  actionCount: number;
  /** Days since last outbound action, Infinity if none */
  daysSinceLastAction: number;
  /** Days since record.updatedAt */
  daysSinceLastUpdate: number;
  /** Days since record.createdAt */
  daysSinceCreation: number;
}

/**
 * Configuration rules for static checks.
 * Loaded from WorkflowSchedulerRules.
 */
export interface StaticRules {
  minDaysBetweenActions: number;
  maxActionAttempts: number;
  recordTooRecentDays: number;
  recentUpdateCooldownDays: number;
  highPriorityMinDays: number;
  lowPriorityMultiplier: number;
  enabledStatuses: RecordStatus[];
  escalationThreshold: number;
  batchSize: number;
}

/**
 * Result from a static pre-check.
 */
export interface StaticPreCheckResult {
  /** Should we invoke AI for this record? */
  shouldProceed: boolean;
  /** Human-readable reason code */
  reason: string;
}

/**
 * Return type for individual check functions.
 * null means "continue to next check", object means "return this result".
 */
export type CheckResult = StaticPreCheckResult | null;
