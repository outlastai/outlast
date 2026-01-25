/**
 * Copyright (C) 2026 by Outlast. MIT License.
 */
import type { Request } from "express";
import { toPem, verifyToken, type DbClient, type TokenPayload } from "@outlast/common";
import { prisma } from "../db.js";

/**
 * Extracts bearer token from Authorization header.
 * @param authHeader - The Authorization header value
 * @returns token if present, otherwise undefined
 */
function getBearerToken(authHeader: string | undefined): string | undefined {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return undefined;
  }
  return authHeader.slice("Bearer ".length);
}

const publicKey = toPem(process.env.OUTLAST_IDENTITY_PUBLIC_KEY);

/**
 * Context available to all tRPC procedures.
 */
export interface Context {
  db: DbClient;
  isAuthenticated: boolean;
  user?: TokenPayload;
  accessKeyId?: string;
  accessToken?: string;
  ip?: string;
}

/**
 * Creates context for each tRPC request.
 * @param opts - Request options containing the Express request
 * @returns Context with db client and authentication status
 */
export async function createContext({ req }: { req: Request }): Promise<Context> {
  const authHeader = req.headers.authorization;
  const accessKeyIdHeader = req.headers["x-access-key-id"];
  const accessKeyIdFromHeader = Array.isArray(accessKeyIdHeader)
    ? accessKeyIdHeader[0]
    : accessKeyIdHeader;
  const token = getBearerToken(authHeader);
  let user: TokenPayload | undefined;

  if (token && publicKey) {
    try {
      user = verifyToken(token, publicKey);
    } catch {
      user = undefined;
    }
  }
  // Get client IP from x-forwarded-for header or socket
  const forwardedFor = req.headers["x-forwarded-for"];
  const forwardedIp = Array.isArray(forwardedFor)
    ? forwardedFor[0]
    : forwardedFor?.split(",")[0]?.trim();
  const ip = forwardedIp || req.socket?.remoteAddress;

  // Cast prisma to DbClient - the interfaces are compatible at runtime
  // but have minor type differences
  return {
    db: prisma as unknown as DbClient,
    isAuthenticated: Boolean(user),
    user,
    accessKeyId: accessKeyIdFromHeader,
    accessToken: token,
    ip
  };
}
