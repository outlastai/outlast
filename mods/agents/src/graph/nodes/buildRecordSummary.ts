/**
 * Copyright (C) 2026 by Outlast.
 *
 * Build a text summary of the record for the LLM.
 */
import type { ProcurementState } from "../state.js";

export function buildRecordSummary(state: ProcurementState): string {
  const { record, contact, messages, attempts, lastChannel } = state;
  const lines = [
    `Record ID: ${record.id}`,
    `Title: ${record.title}`,
    `Status: ${record.status}`,
    `Priority: ${record.priority ?? "MEDIUM"}`,
    `Attempts so far: ${attempts}`,
    lastChannel ? `Last channel: ${lastChannel}` : "No previous outreach."
  ];

  if (contact) {
    lines.push(
      "",
      "Contact:",
      `  Name: ${contact.name}`,
      `  Email: ${contact.email ?? "N/A"}`,
      `  Phone: ${contact.phone ?? "N/A"}`,
      `  Preferred: ${contact.preferredChannel}`
    );
  }

  if (messages.length > 0) {
    lines.push("", "Recent messages:");
    for (const m of messages.slice(-5)) {
      lines.push(
        `  [${m.role}] ${m.content.substring(0, 80)}${m.content.length > 80 ? "..." : ""}`
      );
    }
  }

  lines.push(
    "",
    "Decide the next action. Reply with exactly one of: needs_email | needs_call | escalate | complete"
  );
  return lines.join("\n");
}
