#!/usr/bin/env node

/**
 * Copyright (C) 2026 by Outlast.
 */
import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

// Load .env from project root
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../../.env") });

import { execute } from "@oclif/core";

await execute({ dir: import.meta.url });
