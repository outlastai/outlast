/**
 * Copyright (C) 2026 by Outlast.
 */
import { TRPCClientError } from "@trpc/client";
import type { AppRouter } from "@outlast/apiserver"; // type-only, no runtime dependency

export class SDKError extends Error {
  readonly code?: string;
  readonly cause?: unknown;

  constructor(message: string, options?: { code?: string; cause?: unknown }) {
    super(message);
    this.name = "SDKError";
    this.code = options?.code;
    this.cause = options?.cause;
  }
}

export class AuthenticationError extends SDKError {
  constructor(message = "Authentication required.", options?: { cause?: unknown }) {
    super(message, { code: "UNAUTHORIZED", cause: options?.cause });
    this.name = "AuthenticationError";
  }
}

export class NotFoundError extends SDKError {
  constructor(message = "Resource not found.", options?: { cause?: unknown }) {
    super(message, { code: "NOT_FOUND", cause: options?.cause });
    this.name = "NotFoundError";
  }
}

export class ValidationError extends SDKError {
  constructor(message = "Invalid request.", options?: { cause?: unknown }) {
    super(message, { code: "BAD_REQUEST", cause: options?.cause });
    this.name = "ValidationError";
  }
}

export const toSDKError = (error: unknown): SDKError => {
  if (error instanceof SDKError) {
    return error;
  }

  if (error instanceof TRPCClientError) {
    const trpcError = error as TRPCClientError<AppRouter>;
    const code = trpcError.data?.code;
    if (code === "UNAUTHORIZED") {
      return new AuthenticationError(error.message, { cause: error });
    }
    if (code === "NOT_FOUND") {
      return new NotFoundError(error.message, { cause: error });
    }
    if (code === "BAD_REQUEST") {
      return new ValidationError(error.message, { cause: error });
    }
    return new SDKError(error.message, { code, cause: error });
  }

  if (error instanceof Error) {
    return new SDKError(error.message, { cause: error });
  }

  return new SDKError("Unknown error.");
};
