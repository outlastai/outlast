/**
 * Copyright (C) 2026 by Outlast.
 *
 * Graph Builder for LangGraph workflows.
 * Reads YAML config files and constructs StateGraphs dynamically.
 *
 * Note: We use type assertions (as any) because LangGraph's TypeScript types
 * expect node names to be known at compile time, but we build graphs dynamically
 * from YAML configs. Runtime validation ensures correctness.
 */
import { readFileSync } from "fs";
import { parse as parseYaml } from "yaml";
import { StateGraph, END } from "@langchain/langgraph";
import type { BaseCheckpointSaver } from "@langchain/langgraph";

import { WorkflowState } from "./state.js";
import { getNode, NODE_REGISTRY } from "./nodes/index.js";
import { getRouter, ROUTER_REGISTRY } from "./routers/index.js";

/**
 * Workflow config schema.
 */
export interface WorkflowConfig {
  name: string;
  description?: string;
  nodes: Array<{
    name: string;
    type: string;
  }>;
  edges: Array<{
    from: string;
    to?: string;
    type?: "sequential" | "conditional";
    router?: string;
    routes?: Record<string, string>;
  }>;
  entryPoint: string;
  interruptBefore?: string[];
  interruptAfter?: string[];
}

/**
 * Load and parse a YAML config file.
 */
export function loadConfig(configPath: string): WorkflowConfig {
  const content = readFileSync(configPath, "utf-8");
  return parseYaml(content) as WorkflowConfig;
}

/**
 * Build a LangGraph StateGraph from a YAML config file.
 * Returns an uncompiled graph.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildGraphFromConfig(configPath: string): StateGraph<any, any, any> {
  const config = loadConfig(configPath);

  // Ensure nodes and routers are imported (triggers registration)
  // These imports happen in the index files

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const graph = new StateGraph(WorkflowState) as StateGraph<any, any, any>;

  // Add nodes
  for (const nodeConfig of config.nodes) {
    const nodeFn = getNode(nodeConfig.type);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (graph as any).addNode(nodeConfig.name, nodeFn);
  }

  // Add edges
  for (const edgeConfig of config.edges) {
    const source = edgeConfig.from;
    const edgeType = edgeConfig.type ?? "sequential";

    if (edgeType === "sequential") {
      // Simple edge
      const target = edgeConfig.to;
      if (!target) continue;

      if (target === "END") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (graph as any).addEdge(source, END);
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (graph as any).addEdge(source, target);
      }
    } else if (edgeType === "conditional") {
      // Conditional edge with router
      const routerName = edgeConfig.router;
      const routes = edgeConfig.routes;

      if (!routerName || !routes) continue;

      const routerFn = getRouter(routerName);

      // Convert "END" strings to actual END constant
      const pathMap: Record<string, string | typeof END> = {};
      for (const [key, value] of Object.entries(routes)) {
        pathMap[key] = value === "END" ? END : value;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (graph as any).addConditionalEdges(source, routerFn, pathMap);
    }
  }

  // Set entry point
  if (config.entryPoint) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (graph as any).setEntryPoint(config.entryPoint);
  }

  return graph;
}

/**
 * Build and compile a LangGraph StateGraph from a YAML config file.
 */
export function buildAndCompileGraph(configPath: string, checkpointer?: BaseCheckpointSaver) {
  const config = loadConfig(configPath);
  const graph = buildGraphFromConfig(configPath);

  // Compile options - use 'any' for dynamic node names
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const compileOptions: any = {};

  if (checkpointer) {
    compileOptions.checkpointer = checkpointer;
  }

  if (config.interruptBefore && config.interruptBefore.length > 0) {
    compileOptions.interruptBefore = config.interruptBefore;
  }

  if (config.interruptAfter && config.interruptAfter.length > 0) {
    compileOptions.interruptAfter = config.interruptAfter;
  }

  return graph.compile(compileOptions);
}

/**
 * Validate a workflow config file.
 */
export function validateConfig(configPath: string): string[] {
  const errors: string[] = [];
  const config = loadConfig(configPath);

  // Get all defined node names
  const nodeNames = new Set(config.nodes.map((n) => n.name));

  // Check nodes
  for (const nodeConfig of config.nodes) {
    if (!NODE_REGISTRY.has(nodeConfig.type)) {
      errors.push(`Unknown node type: ${nodeConfig.type}`);
    }
  }

  // Check entry point
  if (config.entryPoint && !nodeNames.has(config.entryPoint)) {
    errors.push(`Entry point '${config.entryPoint}' not found in nodes`);
  }

  // Check edges
  for (const edgeConfig of config.edges) {
    if (!nodeNames.has(edgeConfig.from)) {
      errors.push(`Edge source '${edgeConfig.from}' not found in nodes`);
    }

    const edgeType = edgeConfig.type ?? "sequential";

    if (edgeType === "sequential") {
      const target = edgeConfig.to;
      if (target && target !== "END" && !nodeNames.has(target)) {
        errors.push(`Edge target '${target}' not found in nodes`);
      }
    } else if (edgeType === "conditional") {
      const routerName = edgeConfig.router;
      if (routerName && !ROUTER_REGISTRY.has(routerName)) {
        errors.push(`Unknown router: ${routerName}`);
      }

      const routes = edgeConfig.routes ?? {};
      for (const target of Object.values(routes)) {
        if (target !== "END" && !nodeNames.has(target)) {
          errors.push(`Route target '${target}' not found in nodes`);
        }
      }
    }
  }

  // Check interrupt nodes exist
  for (const nodeName of config.interruptBefore ?? []) {
    if (!nodeNames.has(nodeName)) {
      errors.push(`interruptBefore node '${nodeName}' not found`);
    }
  }

  for (const nodeName of config.interruptAfter ?? []) {
    if (!nodeNames.has(nodeName)) {
      errors.push(`interruptAfter node '${nodeName}' not found`);
    }
  }

  return errors;
}

/**
 * Get list of all registered node types.
 */
export function listAvailableNodes(): string[] {
  return Array.from(NODE_REGISTRY.keys());
}

/**
 * Get list of all registered routers.
 */
export function listAvailableRouters(): string[] {
  return Array.from(ROUTER_REGISTRY.keys());
}
