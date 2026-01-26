/**
 * Copyright (C) 2026 by Outlast.
 */
import type { ToolResult } from "../types.js";
import type { ToolExecutorDependencies } from "./types.js";

/**
 * Handle sendCall tool call.
 * Initiates call and creates RecordHistory entry.
 */
export async function handleSendCall(
  deps: ToolExecutorDependencies,
  args: Record<string, unknown>
): Promise<ToolResult> {
  const recordId = args.recordId as string;
  const talkingPoints = args.talkingPoints as string;

  // Get record with contact
  const record = await deps.getRecord(recordId);
  if (!record) {
    return { success: false, message: `Record not found: ${recordId}` };
  }

  if (!record.contact?.phone) {
    return { success: false, message: "Contact has no phone number" };
  }

  // Initiate call
  const callResult = await deps.initiateCall({
    phone: record.contact.phone,
    talkingPoints
  });

  // Create history entry
  await deps.createRecordHistory({
    recordId,
    status: record.status,
    aiNote: `Initiated call: ${talkingPoints.substring(0, 100)}...`,
    agent: "workflow-runner",
    channel: "PHONE",
    channelMetadata: { callId: callResult.callId, talkingPoints }
  });

  return {
    success: true,
    message: `Call initiated to ${record.contact.phone}`,
    data: { callId: callResult.callId }
  };
}
