/**
 * Copyright (C) 2026 by Outlast.
 *
 * LangGraph state annotation for procurement workflows.
 */
import { Annotation } from "@langchain/langgraph";

/**
 * Message in the conversation thread (stored in state).
 */
export interface ProcurementMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  channel?: string;
  channelMessageId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Record shape (minimal for graph state).
 */
export interface ProcurementRecord {
  id: string;
  title: string;
  status: string;
  priority?: string | null;
  type?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Contact shape (minimal for graph state).
 */
export interface ProcurementContact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  preferredChannel: string;
}

/**
 * State annotation for procurement workflow graph.
 * Used with StateGraph to define the shared state between nodes.
 */
export const ProcurementStateAnnotation = Annotation.Root({
  record: Annotation<ProcurementRecord>(),
  contact: Annotation<ProcurementContact | null>(),
  messages: Annotation<ProcurementMessage[]>({
    reducer: (left: ProcurementMessage[], right: ProcurementMessage | ProcurementMessage[]) => {
      if (Array.isArray(right)) {
        return [...left, ...right];
      }
      return [...left, right];
    },
    default: () => []
  }),
  attempts: Annotation<number>({
    reducer: (_, right) => (typeof right === "number" ? right : 0),
    default: () => 0
  }),
  lastChannel: Annotation<string | null>({
    reducer: (_, right) => (typeof right === "string" ? right : null),
    default: () => null
  }),
  waitingForResponse: Annotation<boolean>({
    reducer: (_, right) => (typeof right === "boolean" ? right : false),
    default: () => false
  }),
  workflowStatus: Annotation<string>({
    reducer: (_, right) => (typeof right === "string" ? right : "RUNNING"),
    default: () => "RUNNING"
  }),
  currentNode: Annotation<string | null>({
    reducer: (_, right) => (typeof right === "string" ? right : null),
    default: () => null
  }),
  /** Set by analyzeRecord for conditional routing. */
  nextNode: Annotation<string | null>({
    reducer: (_, right) => (typeof right === "string" ? right : null),
    default: () => null
  })
});

export type ProcurementState = typeof ProcurementStateAnnotation.State;
export type ProcurementStateUpdate = typeof ProcurementStateAnnotation.Update;
