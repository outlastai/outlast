/**
 * Copyright (C) 2026 by Outlast. MIT License.
 */
import type { IncomingHttpHeaders } from "http";
import { verifyToken, type TokenPayload } from "@outlast/common";
import { OUTLAST_IDENTITY_PUBLIC_KEY } from "../envs.js";

const getHeaderValue = (headers: IncomingHttpHeaders, headerName: string): string | undefined => {
  const value = headers[headerName];
  if (!value) {
    return undefined;
  }
  return Array.isArray(value) ? value[0] : value;
};

const getBearerToken = (authorization: string | undefined): string | undefined => {
  if (!authorization?.startsWith("Bearer ")) {
    return undefined;
  }
  return authorization.slice("Bearer ".length);
};

export interface IdentityContext {
  accessToken?: string;
  accessKeyId?: string;
  user?: TokenPayload;
  ip?: string;
}

export const createIdentityContext = (opts: {
  headers: IncomingHttpHeaders;
  ip?: string;
}): IdentityContext => {
  const accessKeyId = getHeaderValue(opts.headers, "x-access-key-id");
  const authorization = getHeaderValue(opts.headers, "authorization");
  const accessToken = getBearerToken(authorization);

  let user: TokenPayload | undefined;
  if (accessToken && OUTLAST_IDENTITY_PUBLIC_KEY) {
    try {
      user = verifyToken(accessToken, OUTLAST_IDENTITY_PUBLIC_KEY);
    } catch {
      user = undefined;
    }
  }

  // Get IP from x-forwarded-for header or passed ip parameter
  const forwardedFor = getHeaderValue(opts.headers, "x-forwarded-for");
  const ip = forwardedFor?.split(",")[0]?.trim() || opts.ip;

  return {
    accessToken,
    accessKeyId,
    user,
    ip
  };
};
