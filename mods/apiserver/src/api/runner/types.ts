/**
 * Copyright (C) 2026 by Outlast.
 *
 * Local types for workflow runner database operations (internal use only).
 */
import type { WorkflowWithRules, RecordWithHistory } from "@outlast/agents";

/**
 * Schedulable workflow info for cron scheduler.
 */
export interface SchedulableWorkflow {
  id: string;
  name: string;
  schedule: string | null;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Database client interface for runner operations.
 * Uses permissive types to allow Prisma client duck-typing.
 * Return types are transformed in individual functions.
 */
export interface RunnerDbClient {
  workflow: {
    findUnique: (args: any) => Promise<any>;
    findMany: (args?: any) => Promise<any[]>;
  };
  record: {
    findUnique: (args: any) => Promise<any>;
    update: (args: any) => Promise<any>;
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// Re-export types from agents for convenience
export type { WorkflowWithRules, RecordWithHistory };
