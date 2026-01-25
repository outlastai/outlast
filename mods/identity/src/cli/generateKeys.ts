/**
 * Copyright (C) 2026 by Outlast. MIT License.
 */
import { generateKeyPairSync } from "crypto";

const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: {
    type: "spki",
    format: "pem"
  },
  privateKeyEncoding: {
    type: "pkcs8",
    format: "pem"
  }
});

const toSingleLine = (pem: string) => pem.trim().replace(/\n/g, "\\n");

console.log("# Copy these lines to your .env file:\n");

console.log(`OUTLAST_IDENTITY_PRIVATE_KEY="${toSingleLine(privateKey)}"`);

console.log(`OUTLAST_IDENTITY_PUBLIC_KEY="${toSingleLine(publicKey)}"`);
