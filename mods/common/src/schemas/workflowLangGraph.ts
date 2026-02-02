/**
 * Copyright (C) 2026 by Outlast.
 *
 * Schema for the LangGraph-based workflow YAML format.
 * Includes nodes, edges, interrupts, and evals sections.
 */
import { z } from "zod/v4";
import { recordStatusEnum } from "./schedulerRules.js";

const channelEnum = z.enum(["EMAIL", "PHONE", "SMS", "WHATSAPP"]);

/**
 * Condition for conditional edges from a node.
 */
export const nodeConditionSchema = z.object({
  condition: z.string(),
  target: z.string()
});

/**
 * Single node definition in the graph.
 */
export const graphNodeSchema = z.object({
  type: z.enum(["llm", "tool", "interrupt"]),
  prompt: z.string().optional(),
  tool: z.string().optional(),
  next: z.union([z.string(), z.array(nodeConditionSchema)]).optional(),
  onComplete: z.string().optional(),
  timeout: z.string().optional(),
  reason: z.string().optional(),
  onTimeout: z.string().optional(),
  onResponse: z.string().optional(),
  args: z.record(z.string(), z.unknown()).optional()
});

/**
 * Nodes map: node name -> node definition.
 */
export const graphNodesSchema = z.record(z.string(), graphNodeSchema);

/**
 * Scheduler section for batch triggering.
 */
export const workflowSchedulerSchema = z.object({
  cron: z.string().optional(),
  batchSize: z.number().int().min(1).max(500).optional(),
  filters: z
    .object({
      status: z.array(recordStatusEnum).optional()
    })
    .optional()
});

/**
 * Eval context shared across all scenarios.
 */
export const evalsContextSchema = z.object({
  workspaceId: z.string().optional()
});

/**
 * Initial state for an eval scenario.
 */
export const evalInitialStateSchema = z.object({
  record: z.record(z.string(), z.unknown()),
  contact: z.record(z.string(), z.unknown()).nullable().optional()
});

/**
 * Mock resume data for an interrupt (consumed in order).
 */
export const evalInterruptResumeSchema = z.object({
  resume: z.union([
    z.object({
      channel: channelEnum,
      content: z.string(),
      channelMessageId: z.string().optional(),
      timeout: z.boolean().optional(),
      metadata: z.record(z.string(), z.unknown()).optional()
    }),
    z.object({
      channel: channelEnum.optional(),
      content: z.string().optional(),
      timeout: z.boolean().optional()
    })
  ])
});

/**
 * Expected tool call with optional argument matching.
 */
export const expectedToolCallSchema = z.object({
  name: z.string(),
  args: z.record(z.string(), z.unknown()).optional(),
  matchMode: z.enum(["strict", "judge"]).optional()
});

/**
 * Expected LLM response quality check.
 */
export const expectedLlmResponseSchema = z.object({
  node: z.string(),
  contains: z.array(z.string()).optional(),
  sentiment: z.string().optional()
});

/**
 * Expected outcomes for a scenario.
 */
export const evalExpectedSchema = z.object({
  nodeSequence: z.array(z.string()).optional(),
  finalState: z.record(z.string(), z.unknown()).optional(),
  record: z.object({ status: recordStatusEnum }).optional(),
  toolsCalled: z.array(expectedToolCallSchema).optional(),
  llmResponses: z.array(expectedLlmResponseSchema).optional()
});

/**
 * Single eval scenario.
 */
export const evalScenarioSchema = z.object({
  id: z.string(),
  description: z.string().optional(),
  initialState: evalInitialStateSchema,
  mockTools: z.record(z.string(), z.object({ response: z.unknown() })).optional(),
  interrupts: z.array(evalInterruptResumeSchema).optional(),
  expected: evalExpectedSchema
});

/**
 * Evals section in workflow file.
 */
export const evalsSectionSchema = z.object({
  context: evalsContextSchema.optional(),
  scenarios: z.array(evalScenarioSchema)
});

/**
 * LangGraph workflow file schema (graph structure only).
 */
export const workflowLangGraphFileSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().nullable().optional(),
  model: z.string().nullable().optional(),
  temperature: z.number().min(0).max(2).nullable().optional(),
  entrypoint: z.string().optional(),
  nodes: graphNodesSchema.optional(),
  scheduler: workflowSchedulerSchema.optional(),
  evals: evalsSectionSchema.optional()
});

export type NodeCondition = z.infer<typeof nodeConditionSchema>;
export type GraphNode = z.infer<typeof graphNodeSchema>;
export type GraphNodes = z.infer<typeof graphNodesSchema>;
export type WorkflowScheduler = z.infer<typeof workflowSchedulerSchema>;
export type WorkflowLangGraphFile = z.infer<typeof workflowLangGraphFileSchema>;
export type EvalsContext = z.infer<typeof evalsContextSchema>;
export type EvalInitialState = z.infer<typeof evalInitialStateSchema>;
export type EvalInterruptResume = z.infer<typeof evalInterruptResumeSchema>;
export type ExpectedToolCall = z.infer<typeof expectedToolCallSchema>;
export type ExpectedLlmResponse = z.infer<typeof expectedLlmResponseSchema>;
export type EvalExpected = z.infer<typeof evalExpectedSchema>;
export type EvalScenario = z.infer<typeof evalScenarioSchema>;
export type EvalsSection = z.infer<typeof evalsSectionSchema>;
