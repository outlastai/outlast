/**
 * Copyright (C) 2026 by Outlast.
 */
export type WorkspaceAccess = {
  workspaceRef: string;
  role: string;
};

export type TokenPayload = {
  sub: string;
  accessKeyId: string;
  workspaceAccess?: WorkspaceAccess[];
  [key: string]: unknown;
};

export type VerifyTokenOptions = {
  issuer?: string;
  audience?: string | string[];
};
