/**
 * Copyright (C) 2026 by Outlast.
 */
import type { ToolResult } from "../types.js";
import type { ToolExecutorDependencies } from "./types.js";

/**
 * Handle sendEmail tool call.
 * Sends email and creates RecordHistory entry.
 */
export async function handleSendEmail(
  deps: ToolExecutorDependencies,
  args: Record<string, unknown>
): Promise<ToolResult> {
  const recordId = args.recordId as string;
  const subject = args.subject as string;
  const body = args.body as string;

  // Get record with contact
  const record = await deps.getRecord(recordId);
  if (!record) {
    return { success: false, message: `Record not found: ${recordId}` };
  }

  if (!record.contact?.email) {
    return { success: false, message: "Contact has no email address" };
  }

  // Send email
  const emailResult = await deps.sendEmail({
    to: record.contact.email,
    subject,
    body
  });

  // Create history entry
  await deps.createRecordHistory({
    recordId,
    status: record.status,
    aiNote: `Sent email: ${subject}`,
    agent: "workflow-runner",
    channel: "EMAIL",
    channelMetadata: { messageId: emailResult.messageId, subject }
  });

  return {
    success: true,
    message: `Email sent to ${record.contact.email}`,
    data: { messageId: emailResult.messageId }
  };
}
