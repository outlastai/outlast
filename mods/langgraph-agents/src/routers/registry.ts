/**
 * Copyright (C) 2026 by Outlast.
 *
 * Router Registry for LangGraph conditional edges.
 */
import type { WorkflowStateType } from "../state.js";

/**
 * Type for router functions.
 * Each router receives the current state and returns a route key string.
 */
export type RouterFunction = (state: WorkflowStateType) => string;

/**
 * Global registry mapping router names to functions.
 */
export const ROUTER_REGISTRY: Map<string, RouterFunction> = new Map();

/**
 * Register a router function in the registry.
 */
export function registerRouter(name: string, fn: RouterFunction): void {
  if (ROUTER_REGISTRY.has(name)) {
    throw new Error(`Router '${name}' is already registered`);
  }
  ROUTER_REGISTRY.set(name, fn);
}

/**
 * Get a router function by name.
 */
export function getRouter(name: string): RouterFunction {
  const fn = ROUTER_REGISTRY.get(name);
  if (!fn) {
    const available = Array.from(ROUTER_REGISTRY.keys()).join(", ");
    throw new Error(`Unknown router: ${name}. Available: ${available}`);
  }
  return fn;
}

/**
 * Helper to create and register a router.
 */
export function createRouter(name: string, fn: RouterFunction): RouterFunction {
  registerRouter(name, fn);
  return fn;
}
