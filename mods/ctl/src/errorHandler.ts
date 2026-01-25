/**
 * Copyright (C) 2026 by Outlast. MIT License.
 */

import { AuthenticationError, SDKError, ValidationError } from "@outlast/sdk";

/**
 * Handles errors from SDK calls and formats them for CLI output.
 * @param error - The error to handle
 * @param errorFn - The CLI error function to call
 */
export default function errorHandler(
  error: unknown,
  errorFn: (message: string, options?: { exit: number }) => never
): never {
  if (error instanceof AuthenticationError) {
    errorFn("Authentication failed. Run 'ol workspaces:login' first.", { exit: 1 });
  }

  if (error instanceof ValidationError) {
    errorFn(`Validation error: ${error.message}`, { exit: 1 });
  }

  if (error instanceof SDKError) {
    errorFn(error.message, { exit: 1 });
  }

  if (error instanceof Error) {
    errorFn(error.message, { exit: 1 });
  }

  errorFn("An unknown error occurred", { exit: 1 });
}
