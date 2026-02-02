/**
 * Copyright (C) 2026 by Outlast.
 *
 * Workflow State Schema for LangGraph workflows.
 */
import { Annotation } from "@langchain/langgraph";

/**
 * Workflow state annotation using LangGraph's Annotation API.
 * This defines the shape of state passed between nodes.
 */
export const WorkflowState = Annotation.Root({
  // Record and workflow identifiers
  recordId: Annotation<string>,
  workflowRunId: Annotation<string>,
  workspaceId: Annotation<string>,

  // Input data from scheduler
  data: Annotation<Record<string, unknown>>,

  // Phone call state
  callRef: Annotation<string | null>({
    default: () => null,
    reducer: (_, next) => next
  }),
  callStatus: Annotation<string | null>({
    default: () => null,
    reducer: (_, next) => next
  }),
  chatHistory: Annotation<Array<Record<string, unknown>> | null>({
    default: () => null,
    reducer: (_, next) => next
  }),
  recordingUrl: Annotation<string | null>({
    default: () => null,
    reducer: (_, next) => next
  }),
  callDuration: Annotation<number | null>({
    default: () => null,
    reducer: (_, next) => next
  }),

  // Email state
  emailSent: Annotation<boolean>({
    default: () => false,
    reducer: (_, next) => next
  }),
  emailMessageId: Annotation<string | null>({
    default: () => null,
    reducer: (_, next) => next
  }),
  emailSubject: Annotation<string | null>({
    default: () => null,
    reducer: (_, next) => next
  }),
  emailBody: Annotation<string | null>({
    default: () => null,
    reducer: (_, next) => next
  }),

  // Escalation state
  escalated: Annotation<boolean>({
    default: () => false,
    reducer: (_, next) => next
  }),
  escalationReason: Annotation<string | null>({
    default: () => null,
    reducer: (_, next) => next
  }),

  // Record updates
  recordStatus: Annotation<string | null>({
    default: () => null,
    reducer: (_, next) => next
  }),
  recordNote: Annotation<string | null>({
    default: () => null,
    reducer: (_, next) => next
  }),

  // Append-only fields (using reducer that concatenates arrays)
  errors: Annotation<string[]>({
    default: () => [],
    reducer: (prev, next) => [...prev, ...next]
  }),
  messages: Annotation<string[]>({
    default: () => [],
    reducer: (prev, next) => [...prev, ...next]
  })
});

/**
 * Type alias for the workflow state.
 */
export type WorkflowStateType = typeof WorkflowState.State;

/**
 * Create initial state for a workflow run.
 */
export function createInitialState(
  recordId: string,
  workflowRunId: string,
  workspaceId: string,
  data: Record<string, unknown>
): Partial<WorkflowStateType> {
  return {
    recordId,
    workflowRunId,
    workspaceId,
    data,
    callRef: null,
    callStatus: null,
    chatHistory: null,
    recordingUrl: null,
    callDuration: null,
    emailSent: false,
    emailMessageId: null,
    emailSubject: null,
    emailBody: null,
    escalated: false,
    escalationReason: null,
    recordStatus: null,
    recordNote: null,
    errors: [],
    messages: []
  };
}
