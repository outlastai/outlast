/**
 * Copyright (C) 2026 by Outlast.
 */
import { WorkspaceConfig } from "./types.js";

function setActiveWorkspace(ref: string, workspaces: WorkspaceConfig[]): WorkspaceConfig[] {
  return workspaces.map((workspace) => {
    if (workspace.workspaceRef === ref) {
      return { ...workspace, active: true };
    }

    return { ...workspace, active: false };
  });
}

export { setActiveWorkspace };
