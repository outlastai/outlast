/**
 * Copyright (C) 2026 by Outlast.
 *
 * Node Registry for LangGraph workflows.
 */
import type { WorkflowStateType } from "../state.js";

/**
 * Type for node functions.
 * Each node receives the current state and returns a partial state update.
 */
export type NodeFunction = (
  state: WorkflowStateType
) => Promise<Partial<WorkflowStateType>> | Partial<WorkflowStateType>;

/**
 * Global registry mapping node type names to functions.
 */
export const NODE_REGISTRY: Map<string, NodeFunction> = new Map();

/**
 * Register a node function in the registry.
 */
export function registerNode(name: string, fn: NodeFunction): void {
  if (NODE_REGISTRY.has(name)) {
    throw new Error(`Node '${name}' is already registered`);
  }
  NODE_REGISTRY.set(name, fn);
}

/**
 * Get a node function by name.
 */
export function getNode(name: string): NodeFunction {
  const fn = NODE_REGISTRY.get(name);
  if (!fn) {
    const available = Array.from(NODE_REGISTRY.keys()).join(", ");
    throw new Error(`Unknown node type: ${name}. Available: ${available}`);
  }
  return fn;
}

/**
 * Decorator-style function to create and register a node.
 */
export function createNode(name: string, fn: NodeFunction): NodeFunction {
  registerNode(name, fn);
  return fn;
}
