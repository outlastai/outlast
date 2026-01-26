/**
 * Copyright (C) 2026 by Outlast.
 */
import { Args, Command } from "@oclif/core";
import { getActiveWorkspace, getConfig, setActiveWorkspace } from "../../config/index.js";
import { saveConfig } from "../../config/saveConfig.js";
import { CONFIG_FILE } from "../../constants.js";

export default class Use extends Command {
  static override readonly description = "set a Workspace as the default";
  static override readonly examples = ["<%= config.bin %> <%= command.id %>"];
  static override readonly args = {
    ref: Args.string({
      description: "The Workspace to set as active",
      required: true
    })
  };

  public async run(): Promise<void> {
    const { args } = await this.parse(Use);
    const { ref } = args;
    const workspaces = getConfig(CONFIG_FILE);

    if (!workspaces.some((workspace) => workspace.workspaceRef === ref)) {
      this.error(`Workspace not found: ${ref}`);
    }

    const updatedWorkspaces = setActiveWorkspace(ref, workspaces);
    const activeWorkspace = getActiveWorkspace(updatedWorkspaces);

    if (!activeWorkspace) {
      this.error(`Workspace not found: ${ref}`);
    }

    saveConfig(CONFIG_FILE, updatedWorkspaces);

    const { workspaceName, workspaceRef } = activeWorkspace;
    this.log(`Current Workspace: ${workspaceName} (${workspaceRef})`);
  }
}
