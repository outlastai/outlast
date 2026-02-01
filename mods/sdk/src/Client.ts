/**
 * Copyright (C) 2026 by Outlast.
 */
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "@outlast/apiserver"; // type-only, no runtime dependency
import { AuthenticationError, toSDKError } from "./errors.js";
import type { ClientConfig, LoginResponse } from "./types.js";

const DEFAULT_ENDPOINT = "http://localhost:3000";

type TrpcClient = ReturnType<typeof createTRPCClient<AppRouter>>;

/**
 * Base64 decode that works in both Node.js and browser environments.
 */
const base64Decode = (str: string): string => {
  // Browser environment
  if (typeof atob === "function") {
    return atob(str);
  }
  // Node.js environment
  return Buffer.from(str, "base64").toString("utf8");
};

const decodeJwtPayload = (token: string): Record<string, unknown> => {
  const parts = token.split(".");
  if (parts.length < 2) {
    return {};
  }

  const payload = parts[1];
  const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
  const json = base64Decode(padded);

  try {
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return {};
  }
};

/**
 * @classdesc Outlast Client provides authentication and resource access methods
 * to interact with an Outlast API deployment using tRPC.
 *
 * @example
 *
 * const SDK = require("@outlast/sdk");
 *
 * async function main() {
 *   const client = new SDK.Client({
 *     workspaceAccessKeyId: "WO00000000000000000000000000000000",
 *     endpoint: "http://localhost:3000"
 *   });
 *   await client.loginWithApiKey("AK00000...", "secret");
 *
 *   const workspaces = new SDK.Workspaces(client);
 *   const response = await workspaces.listWorkspaces();
 *   console.log(response.items);
 * }
 *
 * main().catch(console.error);
 */
class Client {
  private readonly endpoint: string;
  private accessToken?: string;
  private workspaceAccessKeyId: string;

  /**
   * Constructs a new Client object.
   *
   * @param {ClientConfig} config - Client configuration
   * @param {string} config.endpoint - The base URL of the Outlast API
   * @param {string} [config.workspaceAccessKeyId] - The workspace access key ID (WO...). Required for apiserver calls.
   */
  constructor(config: ClientConfig = {}) {
    this.endpoint = config.endpoint ?? DEFAULT_ENDPOINT;
    this.workspaceAccessKeyId = config.workspaceAccessKeyId ?? "";
  }

  /**
   * Authenticates a user using username and password credentials.
   *
   * @param {string} username - The username or email of the user
   * @param {string} password - The password of the user
   * @param {string} [twoFactorCode] - Optional two factor authentication code
   * @return {Promise<LoginResponse>} - The response object with access and refresh tokens
   * @example
   * const client = new SDK.Client({ endpoint: "http://localhost:3000" });
   *
   * client
   *   .login("user@example.com", "password")
   *   .then(console.log)
   *   .catch(console.error);
   */
  async login(username: string, password: string, twoFactorCode?: string): Promise<LoginResponse> {
    try {
      const client = this.createTrpcClient();
      const session = await client.identity.auth.login.mutate({
        username,
        password,
        twoFactorCode
      });

      const accessToken =
        (session as { accessToken?: string }).accessToken ??
        (session as { access_token?: string }).access_token;

      if (!accessToken) {
        throw new AuthenticationError("Login response missing access token.");
      }

      const payload = decodeJwtPayload(accessToken);
      const accessKeyIdFromToken =
        typeof payload.accessKeyId === "string" ? payload.accessKeyId : undefined;

      this.accessToken = accessToken;
      const sessionAccessKeyId =
        (session as { accessKeyId?: string }).accessKeyId ?? accessKeyIdFromToken;
      if (sessionAccessKeyId) {
        this.workspaceAccessKeyId = sessionAccessKeyId;
      }

      return {
        accessToken,
        refreshToken: (session as { refreshToken?: string }).refreshToken,
        idToken: (session as { idToken?: string }).idToken,
        accessKeyId: sessionAccessKeyId
      };
    } catch (error) {
      throw toSDKError(error);
    }
  }

  /**
   * Authenticates a user using an API key.
   *
   * @param {string} accessKeyId - The API key identifier
   * @param {string} accessKeySecret - The API key secret
   * @return {Promise<void>} - Resolves when authentication is complete
   * @example
   * const client = new SDK.Client({ endpoint: "http://localhost:3000" });
   *
   * client
   *   .loginWithApiKey("AK00000...", "secret")
   *   .then(() => console.log("logged in"))
   *   .catch(console.error);
   */
  async loginWithApiKey(accessKeyId: string, accessKeySecret: string): Promise<void> {
    try {
      const client = this.createTrpcClient();
      const session = (await client.identity.auth.exchangeApiKey.mutate({
        accessKeyId,
        accessKeySecret
      })) as { accessToken: string };

      this.accessToken = session.accessToken;
    } catch (error) {
      throw toSDKError(error);
    }
  }

  /**
   * Returns the current access token.
   *
   * @return {string | undefined} - Current access token
   */
  getAccessToken(): string | undefined {
    return this.accessToken;
  }

  /**
   * Returns the workspace access key id (WO...).
   *
   * @return {string} - Workspace access key id, or empty string if not set
   */
  getWorkspaceAccessKeyId(): string {
    return this.workspaceAccessKeyId;
  }

  /**
   * Sets the workspace access key id.
   * This is useful when you need to switch workspace context.
   *
   * @param {string} workspaceAccessKeyId - The workspace access key id to set (WO...)
   */
  setWorkspaceAccessKeyId(workspaceAccessKeyId: string): void {
    this.workspaceAccessKeyId = workspaceAccessKeyId;
  }

  /**
   * Returns the metadata headers for API requests.
   *
   * @return {Record<string, string>} - Headers with token and accessKeyId
   */
  getMetadata(): Record<string, string> {
    return this.buildHeaders();
  }

  /** @internal */
  async request<T>(
    handler: (client: TrpcClient) => Promise<T>,
    options?: { workspaceAccessKeyId?: string; allowUnauthenticated?: boolean }
  ): Promise<T> {
    const allowUnauthenticated = options?.allowUnauthenticated ?? false;
    if (!allowUnauthenticated && !this.accessToken) {
      throw new AuthenticationError();
    }

    try {
      const client = this.createTrpcClient(this.buildHeaders(options?.workspaceAccessKeyId));
      return await handler(client);
    } catch (error) {
      throw toSDKError(error);
    }
  }

  private buildHeaders(workspaceAccessKeyIdOverride?: string): Record<string, string> {
    const headers: Record<string, string> = {};
    if (this.accessToken) {
      headers.Authorization = `Bearer ${this.accessToken}`;
    }
    const workspaceAccessKeyId = workspaceAccessKeyIdOverride ?? this.workspaceAccessKeyId;
    if (workspaceAccessKeyId) {
      headers["x-access-key-id"] = workspaceAccessKeyId;
    }
    return headers;
  }

  private createTrpcClient(headers?: Record<string, string>): TrpcClient {
    return createTRPCClient<AppRouter>({
      links: [
        httpBatchLink({
          url: `${this.endpoint}/trpc`,
          headers: () => headers ?? {}
        })
      ]
    });
  }
}

export { Client };
