/**
 * Copyright (C) 2026 by Outlast. MIT License.
 */
import { Args, Command } from "@oclif/core";
import { getConfig, removeWorkspace } from "../../config/index.js";
import { saveConfig } from "../../config/saveConfig.js";
import { CONFIG_FILE } from "../../constants.js";

export default class Logout extends Command {
  static override readonly description = "unlink a Workspace from the local environment";
  static override readonly examples = ["<%= config.bin %> <%= command.id %>"];
  static override readonly args = {
    ref: Args.string({
      description: "the Workspace to unlink from",
      required: true
    })
  };

  public async run(): Promise<void> {
    const { args } = await this.parse(Logout);
    const { ref } = args;
    const workspaces = getConfig(CONFIG_FILE);
    const updatedWorkspaces = removeWorkspace(ref, workspaces);

    if (updatedWorkspaces.length === workspaces.length) {
      this.error(`Workspace not found: ${ref}`);
    }

    saveConfig(CONFIG_FILE, updatedWorkspaces);
    this.log("Done!");
  }
}
