/**
 * Copyright (C) 2026 by Outlast. MIT License.
 */
import fs from "fs";
import { WorkspaceConfig } from "./types.js";

function getConfig(path: string): WorkspaceConfig[] {
  if (!fs.existsSync(path)) {
    return [];
  }

  const data = fs.readFileSync(path, "utf8");
  return JSON.parse(data) as WorkspaceConfig[];
}

export { getConfig };
