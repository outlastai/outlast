/**
 * Copyright (C) 2026 by Outlast.
 */
import { WorkspaceConfig } from "./types.js";

function removeWorkspace(ref: string, workspaces: WorkspaceConfig[]): WorkspaceConfig[] {
  return workspaces.filter((w) => w.workspaceRef !== ref);
}

export { removeWorkspace };
