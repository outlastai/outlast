/**
 * Copyright (C) 2026 by Outlast.
 *
 * Router: callStatusRouter
 * Routes based on the outcome of a phone call.
 */
import { createRouter } from "./registry.js";
import type { WorkflowStateType } from "../state.js";

/**
 * Route based on call outcome.
 *
 * Returns a key that maps to the next node in the config's routes section.
 */
export const callStatusRouter = createRouter(
  "callStatusRouter",
  (state: WorkflowStateType): string => {
    const callStatus = state.callStatus;
    const chatHistory = state.chatHistory ?? [];

    // If call completed, check if there was actual conversation
    if (callStatus === "completed") {
      // Consider it successful if there were conversation turns
      if (chatHistory.length >= 2) {
        return "completed";
      }
      // Call "completed" but no conversation - treat as no answer
      return "noAnswer";
    }

    // Not answered
    if (callStatus === "noAnswer") {
      return "noAnswer";
    }

    // Failed or unknown status
    if (callStatus === "failed") {
      return "failed";
    }

    // Default to failed for any unexpected status
    return "failed";
  }
);

/**
 * Route based on whether email should be sent.
 */
export const emailRequiredRouter = createRouter(
  "emailRequiredRouter",
  (state: WorkflowStateType): string => {
    const data = state.data ?? {};

    // Check if contact email exists
    if (!data.contactEmail) {
      return "skipEmail";
    }

    // Check if email was already sent
    if (state.emailSent) {
      return "skipEmail";
    }

    // Check if call was successful (might not need email)
    if (state.callStatus === "completed") {
      const chatHistory = state.chatHistory ?? [];
      // If there was substantial conversation, email is optional
      if (chatHistory.length >= 5) {
        return "skipEmail";
      }
    }

    return "sendEmail";
  }
);

/**
 * Route based on whether escalation is needed.
 */
export const escalationRouter = createRouter(
  "escalationRouter",
  (state: WorkflowStateType): string => {
    const errors = state.errors ?? [];
    const callStatus = state.callStatus;

    // Escalate if there were errors
    if (errors.length >= 2) {
      return "escalate";
    }

    // Escalate if call failed
    if (callStatus === "failed") {
      return "escalate";
    }

    return "continue";
  }
);
