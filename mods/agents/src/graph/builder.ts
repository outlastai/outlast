/**
 * Copyright (C) 2026 by Outlast.
 *
 * Build the procurement workflow StateGraph from config and dependencies.
 */
import { StateGraph, START, END } from "@langchain/langgraph";
import type { BaseCheckpointSaver } from "@langchain/langgraph-checkpoint";
import { ProcurementStateAnnotation } from "./state.js";
import type { ProcurementState } from "./state.js";
import type { GraphDependencies } from "./types.js";
import { createNodeFromDefinition, type GraphDefinition } from "./nodeFactory.js";
import { createAnalyzeRecordNode } from "./nodes/analyzeRecord.js";
import { createSendEmailNode } from "./nodes/sendEmail.js";
import { createSendCallNode } from "./nodes/sendCall.js";
import { createWaitForResponseNode } from "./nodes/waitForResponse.js";
import { createProcessResponseNode } from "./nodes/processResponse.js";
import { createHumanReviewNode } from "./nodes/humanReview.js";
import { createMarkCompleteNode } from "./nodes/markComplete.js";
import type { GraphNode } from "@outlast/common";

export type { GraphDependencies } from "./types.js";

/**
 * Options when compiling the graph.
 */
export interface CompileGraphOptions {
  /** Optional checkpointer for persistence (e.g. PostgresSaver). Omit for eval. */
  checkpointer?: BaseCheckpointSaver | false;
}

/**
 * Build the graph dynamically from a graph definition (YAML / DB).
 */
function buildDynamicGraph(
  graphDef: GraphDefinition,
  deps: GraphDependencies,
  options: CompileGraphOptions
) {
  const graph = new StateGraph(ProcurementStateAnnotation);

  for (const [name, nodeDef] of Object.entries(graphDef.nodes)) {
    const nodeImpl = createNodeFromDefinition(name, nodeDef as GraphNode, deps);
    graph.addNode(name, nodeImpl);
  }

  // LangGraph addEdge types expect specific node ID types; node names are valid at runtime
  graph.addEdge(START, graphDef.entrypoint as Parameters<typeof graph.addEdge>[1]);

  const routeFromState = (state: ProcurementState): string =>
    state.nextNode === "__end__" ? END : (state.nextNode ?? END);

  for (const [name, nodeDef] of Object.entries(graphDef.nodes)) {
    const def = nodeDef as GraphNode;
    const next = def.next;
    if (typeof next === "string") {
      const target = next === "__end__" ? END : next;
      graph.addEdge(
        name as Parameters<typeof graph.addEdge>[0],
        target as Parameters<typeof graph.addEdge>[1]
      );
    } else if (Array.isArray(next) && next.length > 0) {
      graph.addConditionalEdges(
        name as Parameters<typeof graph.addConditionalEdges>[0],
        routeFromState
      );
    }
  }

  return graph.compile({
    checkpointer: options.checkpointer ?? false
  });
}

/**
 * Build the hardcoded graph (legacy workflows without graphDefinition).
 */
function buildLegacyGraph(deps: GraphDependencies, options: CompileGraphOptions) {
  const { toolExecutor, invokeLLM } = deps;

  const analyzeRecord = createAnalyzeRecordNode(invokeLLM);
  const sendEmail = createSendEmailNode(toolExecutor);
  const sendCall = createSendCallNode(toolExecutor);
  const waitForResponse = createWaitForResponseNode();
  const processResponse = createProcessResponseNode(invokeLLM);
  const humanReview = createHumanReviewNode();
  const markComplete = createMarkCompleteNode(toolExecutor);

  const graph = new StateGraph(ProcurementStateAnnotation)
    .addNode("analyzeRecord", analyzeRecord)
    .addNode("sendEmail", sendEmail)
    .addNode("sendCall", sendCall)
    .addNode("waitForResponse", waitForResponse)
    .addNode("processResponse", processResponse)
    .addNode("humanReview", humanReview)
    .addNode("markComplete", markComplete)
    .addEdge(START, "analyzeRecord")
    .addConditionalEdges("analyzeRecord", (state: ProcurementState) => state.nextNode ?? END)
    .addEdge("sendEmail", "waitForResponse")
    .addEdge("sendCall", "waitForResponse")
    .addConditionalEdges("waitForResponse", (state: ProcurementState) => state.nextNode ?? END)
    .addEdge("processResponse", "analyzeRecord")
    .addConditionalEdges("humanReview", (state: ProcurementState) => state.nextNode ?? END)
    .addConditionalEdges("markComplete", (state: ProcurementState) => state.nextNode ?? END);

  return graph.compile({
    checkpointer: options.checkpointer ?? false
  });
}

/**
 * Create and compile the procurement workflow graph.
 * Uses graphDefinition when present (YAML/DB); otherwise uses the hardcoded graph.
 */
export function createProcurementGraph(deps: GraphDependencies, options: CompileGraphOptions = {}) {
  const { workflow } = deps;

  if (workflow.graphDefinition?.nodes) {
    return buildDynamicGraph(workflow.graphDefinition as GraphDefinition, deps, options);
  }

  return buildLegacyGraph(deps, options);
}
