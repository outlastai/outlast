/**
 * Copyright (C) 2026 by Outlast.
 *
 * Dependencies for building the LangGraph and resuming workflows.
 * Set at startup in index.ts so that createResumeWorkflow/createSubmitHumanReview can build the graph.
 */
import type { WorkflowRunnerDependencies } from "@outlast/agents";

let graphDeps: WorkflowRunnerDependencies | undefined;

export function setGraphDeps(d: WorkflowRunnerDependencies): void {
  graphDeps = d;
}

export function getGraphDeps(): WorkflowRunnerDependencies | undefined {
  return graphDeps;
}
