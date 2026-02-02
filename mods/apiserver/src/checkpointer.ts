/**
 * Copyright (C) 2026 by Outlast.
 *
 * LangGraph checkpointer instance set at startup for use in procedures.
 */
import type { BaseCheckpointSaver } from "@langchain/langgraph-checkpoint";

let checkpointer: BaseCheckpointSaver | undefined;

export function setCheckpointer(cp: BaseCheckpointSaver): void {
  checkpointer = cp;
}

export function getCheckpointer(): BaseCheckpointSaver | undefined {
  return checkpointer;
}
