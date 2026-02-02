/**
 * Copyright (C) 2026 by Outlast.
 *
 * Run workflow eval scenarios: build graph with mocks, handle interrupts, verify.
 */
import { Command, isInterrupted, MemorySaver } from "@langchain/langgraph";
import type { WorkflowGraphConfig } from "../graph/types.js";
import { createProcurementGraph } from "../graph/builder.js";
import type { ProcurementState } from "../graph/state.js";
import { createInvokeLLM } from "../llm/createInvokeLLM.js";
import { allTools } from "../tools/definitions/index.js";
import { createMockToolExecutor } from "./mockToolExecutor.js";
import { createInterruptHandler } from "./interruptHandler.js";
import { verifyScenario } from "./verification.js";
import type { EvalScenario, EvalExpected } from "@outlast/common";
import type { ToolCallRecord } from "./mockToolExecutor.js";
import type { VerificationResult } from "./verification.js";

export interface EvalEvent {
  type: "node:start" | "node:complete" | "interrupt:resume" | "scenario:complete";
  node?: string;
  state?: ProcurementState;
  data?: unknown;
}

export interface ScenarioResult {
  scenario: EvalScenario;
  passed: boolean;
  nodeSequence: string[];
  finalState: ProcurementState;
  toolCalls: ToolCallRecord[];
  verification: VerificationResult;
  error?: string;
}

export interface EvalResults {
  workflowName: string;
  workflowId: string;
  scenarios: ScenarioResult[];
  summary: {
    totalScenarios: number;
    passedScenarios: number;
    failedScenarios: number;
  };
}

/**
 * Build workflow config for graph from workflow-like object.
 */
function toWorkflowConfig(w: {
  id: string;
  name: string;
  model?: string | null;
  systemPrompt?: string | null;
  temperature?: number | null;
  tools?: string[] | null;
  graphDefinition?: { entrypoint: string; nodes: Record<string, unknown> } | null;
}): WorkflowGraphConfig {
  return {
    id: w.id,
    name: w.name,
    model: w.model ?? null,
    systemPrompt: w.systemPrompt ?? null,
    temperature: w.temperature ?? null,
    tools: w.tools ?? null,
    graphDefinition: w.graphDefinition ?? null
  };
}

/**
 * Build initial graph state from scenario initialState.
 */
function toInitialState(scenario: EvalScenario): ProcurementState {
  const { record, contact } = scenario.initialState;
  const r = record as Record<string, unknown>;
  const c = contact as Record<string, unknown> | null | undefined;
  return {
    record: {
      id: (r.id as string) ?? "eval-record",
      title: (r.title as string) ?? "Eval Record",
      status: (r.status as string) ?? "OPEN",
      priority: (r.priority as string | null) ?? null,
      type: (r.type as string) ?? "GENERIC",
      metadata: (r.metadata as Record<string, unknown>) ?? {}
    },
    contact: c
      ? {
          id: (c.id as string) ?? "eval-contact",
          name: (c.name as string) ?? "",
          email: (c.email as string | null) ?? null,
          phone: (c.phone as string | null) ?? null,
          preferredChannel: (c.preferredChannel as string) ?? "EMAIL"
        }
      : null,
    messages: [],
    attempts: 0,
    lastChannel: null,
    waitingForResponse: false,
    workflowStatus: "RUNNING",
    currentNode: null,
    nextNode: null
  };
}

/**
 * Run a single eval scenario.
 */
export async function runScenario(
  workflow: WorkflowGraphConfig & { id: string; name: string },
  scenario: EvalScenario,
  options: {
    openaiApiKey: string;
    onEvent?: (event: EvalEvent) => void;
  }
): Promise<ScenarioResult> {
  const { openaiApiKey, onEvent } = options;

  const { executor: mockExecutor, getCalls } = createMockToolExecutor(scenario.mockTools);
  const interruptHandler = createInterruptHandler(scenario.interrupts);

  const invokeLLM = createInvokeLLM({
    apiKey: openaiApiKey,
    agent: {
      name: workflow.name,
      systemPrompt: workflow.systemPrompt ?? `You are an AI agent for ${workflow.name}.`,
      allowedTools: workflow.tools ?? ["sendEmail", "sendCall", "getRecord", "updateRecordStatus"],
      model: workflow.model ?? "gpt-4o",
      temperature: workflow.temperature ?? 0.7
    },
    allTools,
    toolExecutor: mockExecutor
  }) as (
    messages: Array<{ role: string; content: string }>,
    userContent: string,
    context?: Record<string, unknown>
  ) => Promise<string>;

  // Use in-memory checkpointer for eval - required for interrupt/resume handling
  const checkpointer = new MemorySaver();
  const graph = createProcurementGraph(
    { workflow: toWorkflowConfig(workflow), toolExecutor: mockExecutor, invokeLLM },
    { checkpointer }
  );

  const threadId = `eval-${scenario.id}-${Date.now()}`;
  const config = { configurable: { thread_id: threadId } };

  type GraphInput = ProcurementState | InstanceType<typeof Command>;
  let input: GraphInput = toInitialState(scenario);
  const nodeSequence: string[] = [];
  const llmResponsesByNode: Record<string, string[]> = {};
  let finalState: ProcurementState = input as ProcurementState;

  // Safety limits to prevent infinite loops in eval
  const MAX_ITERATIONS = 50;
  let iterationCount = 0;

  try {
    for (;;) {
      iterationCount++;
      if (iterationCount > MAX_ITERATIONS) {
        throw new Error(
          `Eval exceeded ${MAX_ITERATIONS} iterations without completing. Workflow may be stuck in a loop.`
        );
      }

      const stream = await graph.stream(input as ProcurementState, {
        ...config,
        streamMode: "values"
      });

      for await (const chunk of stream) {
        const state = chunk as ProcurementState;
        if (state.currentNode) {
          onEvent?.({ type: "node:start", node: state.currentNode });
          nodeSequence.push(state.currentNode);
          onEvent?.({ type: "node:complete", node: state.currentNode, state });
        }
        finalState = state;

        if (state.messages?.length) {
          const last = state.messages[state.messages.length - 1];
          if (last.role === "assistant") {
            const node =
              (last.metadata as { node?: string })?.node ?? state.currentNode ?? "unknown";
            if (!llmResponsesByNode[node]) llmResponsesByNode[node] = [];
            llmResponsesByNode[node].push(last.content);
          }
        }

        if (isInterrupted(chunk)) {
          // Check if we have any more defined interrupts
          if (!interruptHandler.hasMore()) {
            // No more interrupts defined - treat this as scenario completion
            // The workflow is waiting for a response that won't come in eval
            onEvent?.({ type: "scenario:complete" });
            finalState = { ...finalState, workflowStatus: "WAITING_HUMAN" };
            break;
          }
          const resume = interruptHandler.next();
          onEvent?.({ type: "interrupt:resume", data: resume });
          input = new Command({ resume });
          break;
        }

        if (state.workflowStatus === "COMPLETED" || state.workflowStatus === "WAITING_HUMAN") {
          onEvent?.({ type: "scenario:complete" });
          break;
        }
      }

      if (
        finalState.workflowStatus === "COMPLETED" ||
        finalState.workflowStatus === "WAITING_HUMAN"
      ) {
        break;
      }
    }
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return {
      scenario,
      passed: false,
      nodeSequence,
      finalState,
      toolCalls: getCalls(),
      verification: {
        nodeSequence: {
          passed: false,
          expected: scenario.expected.nodeSequence ?? [],
          actual: nodeSequence,
          reason: error
        },
        finalState: { passed: false, reason: error },
        record: { passed: false },
        toolsCalled: { passed: false, details: [] },
        llmResponses: { passed: false, details: [] },
        allPassed: false
      },
      error
    };
  }

  const recordStatus = (finalState.record as { status?: string })?.status;
  const verification = await verifyScenario(
    scenario.expected as EvalExpected,
    {
      nodeSequence,
      finalState: finalState as unknown as Record<string, unknown>,
      recordStatus,
      toolCalls: getCalls(),
      llmResponsesByNode
    },
    { apiKey: openaiApiKey }
  );

  return {
    scenario,
    passed: verification.allPassed,
    nodeSequence,
    finalState,
    toolCalls: getCalls(),
    verification
  };
}

/**
 * Run all eval scenarios for a workflow.
 */
export async function runWorkflowEval(
  workflow: WorkflowGraphConfig & { id: string; name: string },
  scenarios: EvalScenario[],
  options: {
    openaiApiKey: string;
    onEvent?: (event: EvalEvent) => void;
    scenarioId?: string;
  }
): Promise<EvalResults> {
  const { scenarioId } = options;
  const toRun = scenarioId ? scenarios.filter((s) => s.id === scenarioId) : scenarios;
  const results: ScenarioResult[] = [];

  for (const scenario of toRun) {
    const result = await runScenario(workflow, scenario, options);
    results.push(result);
  }

  return {
    workflowId: workflow.id,
    workflowName: workflow.name,
    scenarios: results,
    summary: {
      totalScenarios: results.length,
      passedScenarios: results.filter((r) => r.passed).length,
      failedScenarios: results.filter((r) => !r.passed).length
    }
  };
}
