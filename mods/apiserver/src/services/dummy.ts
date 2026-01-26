/**
 * Copyright (C) 2026 by Outlast. MIT License.
 *
 * Dummy service implementations for email and calls.
 * Replace these with real implementations when ready.
 */
import { logger } from "../logger.js";

/**
 * Dummy email service that logs instead of sending.
 *
 * @param params - Email parameters
 * @returns A fake message ID
 */
export async function dummySendEmail(params: {
  to: string;
  subject: string;
  body: string;
}): Promise<{ messageId: string }> {
  logger.info("dummy email sent", {
    to: params.to,
    subject: params.subject,
    bodyLength: params.body.length
  });

  return { messageId: `dummy-email-${Date.now()}` };
}

/**
 * Dummy call service that logs instead of initiating.
 *
 * @param params - Call parameters
 * @returns A fake call ID
 */
export async function dummyInitiateCall(params: {
  phone: string;
  talkingPoints: string;
}): Promise<{ callId: string }> {
  logger.info("dummy call initiated", {
    phone: params.phone,
    talkingPointsLength: params.talkingPoints.length
  });

  return { callId: `dummy-call-${Date.now()}` };
}
