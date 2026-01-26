/**
 * Copyright (C) 2026 by Outlast.
 */
import { WorkspaceConfig } from "./types.js";

function getActiveWorkspace(workspaces: WorkspaceConfig[]): WorkspaceConfig | undefined {
  return workspaces.find((w) => w.active === true);
}

export { getActiveWorkspace };
