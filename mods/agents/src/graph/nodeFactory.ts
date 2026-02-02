/**
 * Copyright (C) 2026 by Outlast.
 *
 * Create graph node implementations from YAML node definitions.
 * Maps node names and definitions to the fixed set of node implementations.
 */
import type { GraphNode, GraphNodes } from "@outlast/common";
import type { GraphDependencies } from "./types.js";
import type { GraphNodeFn } from "./types.js";
import { createAnalyzeRecordNode } from "./nodes/analyzeRecord.js";
import { createSendEmailNode } from "./nodes/sendEmail.js";
import { createSendCallNode } from "./nodes/sendCall.js";
import { createWaitForResponseNode } from "./nodes/waitForResponse.js";
import { createProcessResponseNode } from "./nodes/processResponse.js";
import { createHumanReviewNode } from "./nodes/humanReview.js";
import { createMarkCompleteNode } from "./nodes/markComplete.js";

const SUPPORTED_NODES = [
  "analyzeRecord",
  "sendEmail",
  "sendCall",
  "waitForResponse",
  "processResponse",
  "humanReview",
  "markComplete"
] as const;

function createNode(
  nodeName: (typeof SUPPORTED_NODES)[number],
  deps: GraphDependencies
): GraphNodeFn {
  switch (nodeName) {
    case "analyzeRecord":
      return createAnalyzeRecordNode(deps.invokeLLM);
    case "sendEmail":
      return createSendEmailNode(deps.toolExecutor);
    case "sendCall":
      return createSendCallNode(deps.toolExecutor);
    case "waitForResponse":
      return createWaitForResponseNode();
    case "processResponse":
      return createProcessResponseNode(deps.invokeLLM);
    case "humanReview":
      return createHumanReviewNode();
    case "markComplete":
      return createMarkCompleteNode(deps.toolExecutor);
    default:
      throw new Error(`Unknown graph node: ${nodeName}`);
  }
}

/**
 * Create a graph node implementation from a YAML node definition.
 * Node name must be one of the supported procurement workflow nodes.
 */
export function createNodeFromDefinition(
  nodeName: string,
  _nodeDef: GraphNode,
  deps: GraphDependencies
): GraphNodeFn {
  if (!SUPPORTED_NODES.includes(nodeName as (typeof SUPPORTED_NODES)[number])) {
    throw new Error(`Unknown graph node: ${nodeName}. Supported: ${SUPPORTED_NODES.join(", ")}`);
  }
  return createNode(nodeName as (typeof SUPPORTED_NODES)[number], deps);
}

/**
 * Graph definition shape (entrypoint + nodes) as read from DB or YAML.
 */
export interface GraphDefinition {
  entrypoint: string;
  nodes: GraphNodes;
}
