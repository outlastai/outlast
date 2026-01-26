/**
 * Copyright (C) 2026 by Outlast.
 */
import { Command } from "@oclif/core";
import cliui from "cliui";
import { getConfig } from "../../config/index.js";
import { CONFIG_FILE } from "../../constants.js";

export default class Active extends Command {
  static override description = "display the name of the active Workspace";
  static override examples = ["<%= config.bin %> <%= command.id %>"];

  public async run(): Promise<void> {
    const workspaces = getConfig(CONFIG_FILE);
    const activeWorkspace = workspaces.find((workspace) => workspace.active === true);

    if (!activeWorkspace) {
      this.log("No active workspace. Run 'ol workspaces:login' first.");
      return;
    }

    const { workspaceName, workspaceRef, accessKeyId, endpoint } = activeWorkspace;
    const ui = cliui({ width: 200 });

    ui.div(
      "ACTIVE WORKSPACE\n" +
        "------------------\n" +
        `NAME: \t${workspaceName}\n` +
        `REF: \t${workspaceRef}\n` +
        `ACCESS KEY ID: \t${accessKeyId}\n` +
        `ENDPOINT: \t${endpoint}\n`
    );

    this.log(ui.toString());
  }
}
