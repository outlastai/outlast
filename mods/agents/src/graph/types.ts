/**
 * Copyright (C) 2026 by Outlast.
 *
 * Types for graph builder and node dependencies.
 */
import type { ProcurementState } from "./state.js";
import type { ToolExecutor } from "../tools/types.js";

/**
 * Workflow config for building the graph.
 */
export interface WorkflowGraphConfig {
  id: string;
  name: string;
  model: string | null;
  systemPrompt: string | null;
  temperature: number | null;
  tools: string[] | null;
  /** Graph structure from YAML (entrypoint + nodes). When set, graph is built dynamically. */
  graphDefinition?: { entrypoint: string; nodes: Record<string, unknown> } | null;
}

/**
 * Dependencies for graph node execution.
 */
export interface GraphDependencies {
  workflow: WorkflowGraphConfig;
  toolExecutor: ToolExecutor;
  /** Invoke LLM with messages and user content, return assistant text. */
  invokeLLM: (
    messages: Array<{ role: string; content: string }>,
    userContent: string,
    context?: Record<string, unknown>
  ) => Promise<string>;
}

/**
 * Node function type: receives state, returns partial state update.
 */
export type GraphNodeFn = (
  state: ProcurementState,
  config?: { configurable?: Record<string, unknown> }
) => Promise<Partial<ProcurementState>> | Partial<ProcurementState>;
