/**
 * Copyright (C) 2026 by Outlast.
 */
import { z } from "zod";
import { workspaceConfigSchema } from "./validations.js";

type WorkspaceConfig = z.infer<typeof workspaceConfigSchema>;

export type { WorkspaceConfig };
