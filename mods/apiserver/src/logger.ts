/**
 * Copyright (C) 2026 by Outlast. MIT License.
 */
import { getLogger } from "@fonoster/logger";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);

export const logger = getLogger({ service: "apiserver", filePath: __filename });
