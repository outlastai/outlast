/**
 * Copyright (C) 2026 by Outlast. MIT License.
 */

/**
 * Handles errors from tRPC calls and formats them for CLI output.
 * @param error - The error to handle
 * @param errorFn - The CLI error function to call
 */
export default function errorHandler(
  error: unknown,
  errorFn: (message: string, options?: { exit: number }) => never
): never {
  if (error instanceof Error) {
    // Check for tRPC error structure
    const trpcError = error as { message?: string; data?: { code?: string } };

    if (trpcError.data?.code === "UNAUTHORIZED") {
      errorFn("Authentication failed. Check your OUTLAST_CREDENTIALS.", { exit: 1 });
    }

    if (trpcError.data?.code === "BAD_REQUEST") {
      errorFn(`Validation error: ${trpcError.message}`, { exit: 1 });
    }

    errorFn(error.message, { exit: 1 });
  }

  errorFn("An unknown error occurred", { exit: 1 });
}
