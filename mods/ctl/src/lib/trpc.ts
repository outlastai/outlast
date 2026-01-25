/**
 * Copyright (C) 2026 by Outlast. MIT License.
 */
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "@outlast/apiserver"; // type-only, no runtime dependency

/**
 * Creates a typed tRPC client for the Outlast API.
 * @param baseUrl - The base URL of the API server
 * @param credentials - Basic auth credentials in "username:password" format
 * @returns A typed tRPC client
 */
export function createClient(baseUrl: string, credentials: string) {
  return createTRPCClient<AppRouter>({
    links: [
      httpBatchLink({
        url: `${baseUrl}/trpc`,
        headers: () => ({
          Authorization: `Basic ${Buffer.from(credentials).toString("base64")}`
        })
      })
    ]
  });
}
