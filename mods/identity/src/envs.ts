/**
 * Copyright (C) 2026 by Outlast. MIT License.
 */
import { config } from "dotenv";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { assertEnvsAreSet } from "@outlast/common";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../../.env") });

assertEnvsAreSet([
  "OUTLAST_IDENTITY_DATABASE_URL",
  "OUTLAST_IDENTITY_CLOAK_ENCRYPTION_KEY",
  "OUTLAST_IDENTITY_PRIVATE_KEY",
  "OUTLAST_IDENTITY_PUBLIC_KEY",
  "OUTLAST_IDENTITY_TWILIO_ACCOUNT_SID",
  "OUTLAST_IDENTITY_TWILIO_AUTH_TOKEN",
  "OUTLAST_IDENTITY_TWILIO_PHONE_NUMBER"
]);

const toBoolean = (value: string | undefined, fallback: boolean) => {
  if (value === undefined) {
    return fallback;
  }
  return value.toLowerCase() === "true";
};

const toNumber = (value: string | undefined, fallback: number) => {
  if (value === undefined || value.trim() === "") {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? fallback : parsed;
};

export const OUTLAST_IDENTITY_DATABASE_URL = process.env.OUTLAST_IDENTITY_DATABASE_URL ?? "";

export const OUTLAST_IDENTITY_CLOAK_ENCRYPTION_KEY =
  process.env.OUTLAST_IDENTITY_CLOAK_ENCRYPTION_KEY ?? "";

const toPem = (value: string | undefined) => (value ?? "").replace(/\\n/g, "\n");

export const OUTLAST_IDENTITY_PRIVATE_KEY = toPem(process.env.OUTLAST_IDENTITY_PRIVATE_KEY);

export const OUTLAST_IDENTITY_PUBLIC_KEY = toPem(process.env.OUTLAST_IDENTITY_PUBLIC_KEY);

export const OUTLAST_IDENTITY_ISSUER = process.env.OUTLAST_IDENTITY_ISSUER ?? "outlast";

export const OUTLAST_IDENTITY_AUDIENCE = process.env.OUTLAST_IDENTITY_AUDIENCE ?? "outlast";

export const OUTLAST_IDENTITY_ACCESS_TOKEN_EXPIRES_IN =
  process.env.OUTLAST_IDENTITY_ACCESS_TOKEN_EXPIRES_IN ?? "15m";

export const OUTLAST_IDENTITY_REFRESH_TOKEN_EXPIRES_IN =
  process.env.OUTLAST_IDENTITY_REFRESH_TOKEN_EXPIRES_IN ?? "24h";

export const OUTLAST_IDENTITY_ID_TOKEN_EXPIRES_IN =
  process.env.OUTLAST_IDENTITY_ID_TOKEN_EXPIRES_IN ?? "1h";

export const OUTLAST_IDENTITY_WORKSPACE_INVITE_EXPIRATION =
  process.env.OUTLAST_IDENTITY_WORKSPACE_INVITE_EXPIRATION ?? "7d";

export const OUTLAST_IDENTITY_WORKSPACE_INVITE_URL =
  process.env.OUTLAST_IDENTITY_WORKSPACE_INVITE_URL ?? "";

export const OUTLAST_IDENTITY_WORKSPACE_INVITE_FAIL_URL =
  process.env.OUTLAST_IDENTITY_WORKSPACE_INVITE_FAIL_URL ?? "";

export const OUTLAST_IDENTITY_CONTACT_VERIFICATION_REQUIRED = toBoolean(
  process.env.OUTLAST_IDENTITY_CONTACT_VERIFICATION_REQUIRED,
  false
);

export const OUTLAST_IDENTITY_TWO_FACTOR_AUTH_REQUIRED = toBoolean(
  process.env.OUTLAST_IDENTITY_TWO_FACTOR_AUTH_REQUIRED,
  false
);

export const OUTLAST_IDENTITY_SMTP_SENDER = process.env.OUTLAST_IDENTITY_SMTP_SENDER ?? "";

export const OUTLAST_IDENTITY_SMTP_HOST = process.env.OUTLAST_IDENTITY_SMTP_HOST ?? "";

export const OUTLAST_IDENTITY_SMTP_PORT = toNumber(process.env.OUTLAST_IDENTITY_SMTP_PORT, 587);

export const OUTLAST_IDENTITY_SMTP_SECURE = toBoolean(
  process.env.OUTLAST_IDENTITY_SMTP_SECURE,
  false
);

export const OUTLAST_IDENTITY_SMTP_USER = process.env.OUTLAST_IDENTITY_SMTP_USER ?? "";

export const OUTLAST_IDENTITY_SMTP_PASS = process.env.OUTLAST_IDENTITY_SMTP_PASS ?? "";

export const OUTLAST_IDENTITY_TWILIO_ACCOUNT_SID =
  process.env.OUTLAST_IDENTITY_TWILIO_ACCOUNT_SID ?? "";

export const OUTLAST_IDENTITY_TWILIO_AUTH_TOKEN =
  process.env.OUTLAST_IDENTITY_TWILIO_AUTH_TOKEN ?? "";

export const OUTLAST_IDENTITY_TWILIO_PHONE_NUMBER =
  process.env.OUTLAST_IDENTITY_TWILIO_PHONE_NUMBER ?? "";

export const OUTLAST_IDENTITY_GITHUB_CLIENT_ID =
  process.env.OUTLAST_IDENTITY_GITHUB_CLIENT_ID ?? "";

export const OUTLAST_IDENTITY_GITHUB_CLIENT_SECRET =
  process.env.OUTLAST_IDENTITY_GITHUB_CLIENT_SECRET ?? "";
