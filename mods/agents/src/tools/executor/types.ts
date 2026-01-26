/**
 * Copyright (C) 2026 by Outlast.
 *
 * Types for tool executor dependencies.
 */
import type { ToolResult } from "../types.js";

/**
 * Record with contact for tool handlers.
 */
export interface RecordWithContact {
  id: string;
  title: string;
  status: string;
  priority: string | null;
  contact: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    preferredChannel: string;
  } | null;
}

/**
 * Record history entry.
 */
export interface HistoryEntry {
  id: string;
  status: string;
  aiNote: string | null;
  humanNote: string | null;
  agent: string;
  channel: string;
  createdAt: Date;
}

/**
 * Dependencies required by tool handlers.
 */
export interface ToolExecutorDependencies {
  /** Get record with contact */
  getRecord: (recordId: string) => Promise<RecordWithContact | null>;

  /** Get record history */
  getRecordHistory: (recordId: string, limit?: number) => Promise<HistoryEntry[]>;

  /** Create record history entry */
  createRecordHistory: (data: {
    recordId: string;
    status: string;
    aiNote?: string;
    agent: string;
    channel: string;
    channelMetadata?: Record<string, unknown>;
  }) => Promise<{ id: string }>;

  /** Update record status */
  updateRecordStatus: (recordId: string, status: string) => Promise<{ id: string }>;

  /** Send email (stub for now) */
  sendEmail: (params: {
    to: string;
    subject: string;
    body: string;
  }) => Promise<{ messageId: string }>;

  /** Initiate call (stub for now) */
  initiateCall: (params: { phone: string; talkingPoints: string }) => Promise<{ callId: string }>;
}

/**
 * Handler function type.
 */
export type ToolHandler = (
  deps: ToolExecutorDependencies,
  args: Record<string, unknown>,
  context?: Record<string, unknown>
) => Promise<ToolResult>;
