/**
 * Copyright (C) 2026 by Outlast.
 *
 * Get record history: queries LangGraph checkpoints.
 */
import {
  withErrorHandlingAndValidation,
  getRecordHistorySchema,
  type GetRecordHistoryInput,
  type GetRecordHistoryResponse
} from "@outlast/common";
import type { BaseCheckpointSaver } from "@langchain/langgraph-checkpoint";
import { logger } from "../../logger.js";

/**
 * Map checkpoint channel_values to GetRecordHistoryResponse.
 */
function channelValuesToResponse(
  channelValues: Record<string, unknown>,
  updatedAt: string
): GetRecordHistoryResponse {
  const messages = Array.isArray(channelValues.messages) ? channelValues.messages : [];
  const attempts = typeof channelValues.attempts === "number" ? channelValues.attempts : 0;
  const lastChannel =
    typeof channelValues.lastChannel === "string" || channelValues.lastChannel === null
      ? channelValues.lastChannel
      : null;
  const workflowStatus =
    typeof channelValues.workflowStatus === "string" ? channelValues.workflowStatus : null;

  const allowedRoles = ["system", "user", "assistant", "tool"] as const;
  const normalizedMessages = messages.map((m: unknown) => {
    if (m && typeof m === "object" && "role" in m && "content" in m) {
      const msg = m as Record<string, unknown>;
      const role = String(msg.role);
      const roleVal = allowedRoles.includes(role as (typeof allowedRoles)[number])
        ? (role as (typeof allowedRoles)[number])
        : "user";
      return {
        role: roleVal,
        content: String(msg.content),
        channel: typeof msg.channel === "string" ? msg.channel : undefined,
        channelMessageId:
          typeof msg.channelMessageId === "string" ? msg.channelMessageId : undefined,
        metadata:
          msg.metadata && typeof msg.metadata === "object" && msg.metadata !== null
            ? (msg.metadata as Record<string, unknown>)
            : undefined
      };
    }
    return { role: "user" as const, content: String(m) };
  });

  return {
    messages: normalizedMessages,
    attempts,
    lastChannel,
    workflowStatus: workflowStatus ?? undefined,
    updatedAt
  };
}

/**
 * Creates a function to get history for a specific record.
 * Queries LangGraph checkpoints where recordId = thread_id.
 *
 * @param checkpointer - LangGraph checkpointer for reading history from checkpoints
 * @returns A validated function that returns conversation history
 */
export function createGetRecordHistory(checkpointer: BaseCheckpointSaver) {
  const fn = async (params: GetRecordHistoryInput): Promise<GetRecordHistoryResponse> => {
    logger.verbose("getting record history", { recordId: params.recordId });

    const tuple = await checkpointer.getTuple({
      configurable: { thread_id: params.recordId }
    });
    if (tuple?.checkpoint?.channel_values) {
      const response = channelValuesToResponse(
        tuple.checkpoint.channel_values as Record<string, unknown>,
        tuple.checkpoint.ts ?? new Date().toISOString()
      );
      logger.verbose("record history from LangGraph", { messageCount: response.messages.length });
      return response;
    }
    logger.verbose("no LangGraph checkpoint for record", { recordId: params.recordId });
    return {
      messages: [],
      attempts: 0,
      lastChannel: null,
      updatedAt: null
    };
  };

  return withErrorHandlingAndValidation(fn, getRecordHistorySchema);
}
