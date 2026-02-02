/**
 * Copyright (C) 2026 by Outlast.
 *
 * Node: sendEmail
 * Sends a follow-up email based on the call outcome.
 */
import { createNode } from "./registry.js";
import type { WorkflowStateType } from "../state.js";

// SMTP Configuration (in a real implementation, use nodemailer)
const SMTP_USER = process.env.SMTP_USER ?? "";
const SMTP_FROM = process.env.SMTP_FROM ?? SMTP_USER;

/**
 * Build email content based on call outcome.
 */
function buildEmailContent(
  callStatus: string | null,
  chatHistory: Array<Record<string, unknown>> | null,
  data: Record<string, unknown>
): { subject: string; body: string } {
  const jobDescription = (data.jobDescription as string) ?? "your recent inquiry";

  if (callStatus === "completed" && chatHistory && chatHistory.length > 0) {
    // Summarize the conversation
    const summaryLines = chatHistory.slice(0, 10).map((turn) => {
      const role = turn.role === "assistant" || turn.role === "ai" ? "Agent" : "Customer";
      const content = String(turn.content ?? "").slice(0, 200);
      return `- ${role}: ${content}...`;
    });

    return {
      subject: "Follow-up: Our Recent Conversation",
      body: `Hello,

Thank you for speaking with us regarding ${jobDescription}.

Here's a summary of our conversation:

${summaryLines.join("\n")}

If you have any questions or need further assistance, please don't hesitate to reach out.

Best regards,
The Outlast Team`
    };
  }

  if (callStatus === "noAnswer") {
    return {
      subject: "We Tried to Reach You",
      body: `Hello,

We attempted to contact you regarding ${jobDescription}, but were unable to reach you.

Please feel free to contact us at your convenience, or reply to this email to schedule a callback.

Best regards,
The Outlast Team`
    };
  }

  return {
    subject: "Follow-up from Outlast",
    body: `Hello,

We wanted to follow up with you regarding ${jobDescription}.

Please feel free to contact us if you have any questions.

Best regards,
The Outlast Team`
  };
}

/**
 * Send email via API or SMTP (placeholder implementation).
 */
async function sendSmtpEmail(
  toEmail: string,
  subject: string,
  body: string
): Promise<string | null> {
  // In production, use nodemailer or an email service API
  // This is a placeholder that logs the email
  console.log(`[sendEmail] To: ${toEmail}`);
  console.log(`[sendEmail] Subject: ${subject}`);
  console.log(`[sendEmail] Body: ${body.slice(0, 100)}...`);

  // Return a pseudo message ID
  return `${SMTP_FROM}-${toEmail}-${Date.now()}`;
}

/**
 * Send a follow-up email based on call outcome.
 */
export const sendEmail = createNode(
  "sendEmail",
  async (state: WorkflowStateType): Promise<Partial<WorkflowStateType>> => {
    const data = state.data ?? {};
    const contactEmail = data.contactEmail as string | undefined;

    if (!contactEmail) {
      return {
        emailSent: false,
        errors: ["No contact email provided in data"]
      };
    }

    // Build email content based on call outcome
    const { subject, body } = buildEmailContent(state.callStatus, state.chatHistory, data);

    try {
      const messageId = await sendSmtpEmail(contactEmail, subject, body);

      return {
        emailSent: true,
        emailMessageId: messageId,
        emailSubject: subject,
        emailBody: body,
        messages: [`Email sent to ${contactEmail}`]
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        emailSent: false,
        errors: [`Failed to send email: ${message}`]
      };
    }
  }
);
