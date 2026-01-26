/**
 * Copyright (C) 2026 by Outlast.
 *
 * Cron scheduler for workflow execution.
 */
import cron from "node-cron";
import type { WorkflowRunResult } from "./types.js";

/**
 * Workflow info for scheduling.
 */
interface SchedulableWorkflow {
  id: string;
  name: string;
  schedule: string | null;
}

/**
 * Scheduled job entry.
 */
interface ScheduledJob {
  workflowId: string;
  workflowName: string;
  schedule: string;
  task: cron.ScheduledTask;
}

/**
 * Dependencies for the cron scheduler.
 */
export interface CronSchedulerDependencies {
  /** List all workflows with schedules */
  listWorkflows: () => Promise<SchedulableWorkflow[]>;
  /** Run a workflow */
  runWorkflow: (workflowId: string) => Promise<WorkflowRunResult>;
  /** Logger */
  logger?: {
    info: (message: string, data?: unknown) => void;
    error: (message: string, data?: unknown) => void;
  };
}

/**
 * Create a cron scheduler for workflows.
 */
export function createCronScheduler(deps: CronSchedulerDependencies) {
  const jobs = new Map<string, ScheduledJob>();
  const logger = deps.logger || console;

  return {
    /**
     * Start the scheduler - load all workflows and schedule jobs.
     */
    async start(): Promise<void> {
      const workflows = await deps.listWorkflows();

      for (const workflow of workflows) {
        if (workflow.schedule && cron.validate(workflow.schedule)) {
          this.scheduleWorkflow(workflow);
        }
      }

      logger.info("cron scheduler started", { jobCount: jobs.size });
    },

    /**
     * Stop all scheduled jobs.
     */
    async stop(): Promise<void> {
      for (const [, job] of jobs) {
        job.task.stop();
      }
      jobs.clear();
      logger.info("cron scheduler stopped");
    },

    /**
     * Refresh schedules from database.
     */
    async refresh(): Promise<void> {
      await this.stop();
      await this.start();
    },

    /**
     * Schedule a single workflow.
     */
    scheduleWorkflow(workflow: SchedulableWorkflow): void {
      if (!workflow.schedule) return;

      // Remove existing job if any
      const existing = jobs.get(workflow.id);
      if (existing) {
        existing.task.stop();
      }

      // Create new job
      const task = cron.schedule(workflow.schedule, async () => {
        logger.info("running scheduled workflow", {
          workflowId: workflow.id,
          workflowName: workflow.name
        });

        try {
          const result = await deps.runWorkflow(workflow.id);
          logger.info("Workflow completed", {
            workflowId: workflow.id,
            processed: result.processed,
            actionsTaken: result.actionsTaken
          });
        } catch (error) {
          logger.error("workflow failed", {
            workflowId: workflow.id,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      });

      jobs.set(workflow.id, {
        workflowId: workflow.id,
        workflowName: workflow.name,
        schedule: workflow.schedule,
        task
      });

      logger.info("workflow scheduled", {
        workflowId: workflow.id,
        schedule: workflow.schedule
      });
    },

    /**
     * Unschedule a workflow.
     */
    unscheduleWorkflow(workflowId: string): void {
      const job = jobs.get(workflowId);
      if (job) {
        job.task.stop();
        jobs.delete(workflowId);
        logger.info("workflow unscheduled", { workflowId });
      }
    },

    /**
     * Get list of scheduled workflow IDs.
     */
    getScheduledWorkflows(): string[] {
      return Array.from(jobs.keys());
    },

    /**
     * Check if a workflow is scheduled.
     */
    isScheduled(workflowId: string): boolean {
      return jobs.has(workflowId);
    }
  };
}
