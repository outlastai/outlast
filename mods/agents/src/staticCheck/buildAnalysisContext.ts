/**
 * Copyright (C) 2026 by Outlast.
 *
 * Build RecordAnalysisContext from record and history data.
 */
import { calculateDaysSince } from "./calculateDaysSince.js";
import { ACTION_CHANNELS, type RecordAnalysisContext, type ActionChannel } from "./types.js";

/**
 * Record data needed to build analysis context.
 */
interface RecordInput {
  id: string;
  status: string;
  priority: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * History entry with channel info.
 */
interface HistoryEntry {
  channel: string;
  createdAt: Date;
}

/**
 * Check if a channel is an action channel.
 */
function isActionChannel(channel: string): channel is ActionChannel {
  return ACTION_CHANNELS.includes(channel as ActionChannel);
}

/**
 * Build analysis context from record and its history.
 * Filters history to only count action channels.
 *
 * @param record - The record to analyze
 * @param history - The record's history entries
 * @param now - Current time (for testing)
 */
export function buildAnalysisContext(
  record: RecordInput,
  history: HistoryEntry[],
  now: Date = new Date()
): RecordAnalysisContext {
  // Filter to only action history
  const actionHistory = history.filter((h) => isActionChannel(h.channel));

  // Find most recent action
  const sortedActions = [...actionHistory].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  );
  const lastAction = sortedActions[0];

  return {
    record: {
      id: record.id,
      status: record.status as RecordAnalysisContext["record"]["status"],
      priority: record.priority as RecordAnalysisContext["record"]["priority"],
      createdAt: record.createdAt,
      updatedAt: record.updatedAt
    },
    actionCount: actionHistory.length,
    daysSinceLastAction: lastAction ? calculateDaysSince(lastAction.createdAt, now) : Infinity,
    daysSinceLastUpdate: calculateDaysSince(record.updatedAt, now),
    daysSinceCreation: calculateDaysSince(record.createdAt, now)
  };
}
