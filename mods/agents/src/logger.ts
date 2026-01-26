/**
 * Copyright (C) 2026 by Outlast.
 */
import { getLogger } from "@fonoster/logger";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);

export const logger = getLogger({ service: "agents", filePath: __filename });
