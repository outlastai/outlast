/**
 * Copyright (C) 2026 by Outlast. MIT License.
 */
import type { ZodError } from "zod/v4";

/**
 * Format Zod validation errors into a user-friendly string.
 * Produces output like:
 *   - name: Name is required
 *   - temperature: Number must be less than or equal to 2
 *   - schedulerRules.batchSize: Number must be at least 1
 */
export function formatZodErrors(error: ZodError): string {
  const issues = error.issues;

  if (issues.length === 0) {
    return "Unknown validation error";
  }

  const lines = issues.map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join(".") : "(root)";
    return `  - ${path}: ${issue.message}`;
  });

  return lines.join("\n");
}
