/**
 * Copyright (C) 2026 by Outlast.
 */
import jwt from "jsonwebtoken";
import type { TokenPayload, VerifyTokenOptions } from "./types.js";

export const verifyToken = (
  token: string,
  publicKey: string,
  options: VerifyTokenOptions = {}
): TokenPayload => {
  const verifyOptions: jwt.VerifyOptions = {
    algorithms: ["RS256"],
    issuer: options.issuer
  };

  if (options.audience) {
    // Cast required due to @types/jsonwebtoken tuple type constraint
    verifyOptions.audience = options.audience as jwt.VerifyOptions["audience"];
  }

  const payload = jwt.verify(token, publicKey, verifyOptions);

  return payload as unknown as TokenPayload;
};
