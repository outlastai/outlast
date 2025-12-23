import type { OrderResponse } from '../orders/types';

export interface SchedulerConfig {
  readonly minDaysBetweenFollowUps: number;
  readonly maxFollowUpAttempts: number;
  readonly escalationThreshold: number;
  readonly batchSize: number;
  readonly enabledStatuses: string[]; // Order statuses to process
}

export interface OrderAnalysisContext {
  order: OrderResponse;
  history: Array<{
    id: string;
    orderId: string;
    type: string;
    timestamp: Date;
    aiSummary: string | null;
    context: Record<string, unknown> | null;
    metadata: Record<string, unknown> | null;
    rawData: Record<string, unknown> | null;
    conversationTurn: number | null;
  }>;
  followUpCount: number;
  daysSinceLastUpdate: number;
  daysSinceLastFollowUp: number;
  lastFollowUpChannel?: string;
}

export interface SchedulerResult {
  processed: number;
  followUpsSent: number;
  escalationsCreated: number;
  errors: number;
  details: SchedulerOrderResult[];
}

export interface SchedulerOrderResult {
  orderId: string;
  orderIdExternal: string;
  processed: boolean;
  followUpSent: boolean;
  escalated: boolean;
  skippedReason?: string; // Reason if skipped without AI call
  usedAI?: boolean; // Whether AI was called
  error?: string;
}

export interface StaticPreCheckResult {
  shouldProceed: boolean; // Should we call AI?
  shouldFollowUp: boolean; // Static decision (if we can determine without AI)
  reason: string; // Why we're proceeding or skipping
  skipAI?: boolean; // If true, we have a static decision and don't need AI
}

