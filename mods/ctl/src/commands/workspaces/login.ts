/**
 * Copyright (C) 2026 by Outlast. MIT License.
 */
import { confirm, input, password, select } from "@inquirer/prompts";
import { Client, Workspaces, ApiKeys } from "@outlast/sdk";
import { BaseCommand } from "../../BaseCommand.js";
import { addWorkspace, getConfig } from "../../config/index.js";
import { saveConfig } from "../../config/saveConfig.js";
import { CONFIG_FILE, DEFAULT_ENDPOINT } from "../../constants.js";
import errorHandler from "../../errorHandler.js";

type WorkspaceItem = {
  ref: string;
  name: string;
  accessKeyId: string;
};

export default class Login extends BaseCommand<typeof Login> {
  static override description = "link a Workspace to the local environment";
  static override examples = ["<%= config.bin %> <%= command.id %>"];

  public async run(): Promise<void> {
    this.log("This utility will help you add a Workspace.");
    this.log("Press ^C at any time to quit.");

    const answers = {
      endpoint: await input({
        message: "Endpoint",
        default: DEFAULT_ENDPOINT
      }),
      username: await input({
        message: "Username",
        required: true
      }),
      password: await password({
        message: "Password"
      }),
      confirm: await confirm({
        message: "Ready?"
      })
    };

    if (!answers.confirm) {
      this.log("Aborted!");
      return;
    }

    try {
      const client = new Client({ endpoint: answers.endpoint });
      await client.login(answers.username, answers.password);

      const workspacesClient = new Workspaces(client);
      const workspaceResponse = await workspacesClient.listWorkspaces();

      const workspaces = (
        Array.isArray(workspaceResponse)
          ? workspaceResponse
          : ((workspaceResponse as { items?: WorkspaceItem[] }).items ?? [])
      ) as WorkspaceItem[];

      if (workspaces.length === 0) {
        this.log("");
        this.log("No workspaces found for this account.");
        this.log("");
        this.log("This can happen if:");
        this.log("  - The account has no workspaces created yet");
        this.log("  - The server was not properly initialized with a default workspace");
        this.log("");
        this.log("Please contact your administrator or create a workspace first.");
        this.error("Login failed: no workspaces available.");
      }

      const selectedWorkspace =
        workspaces.length === 1
          ? workspaces[0]
          : await select({
              message: "Select a workspace",
              choices: workspaces.map((workspace) => ({
                name: `${workspace.name} (${workspace.ref})`,
                value: workspace
              }))
            });

      // Set the workspace's accessKeyId for API key creation
      client.setAccessKeyId(selectedWorkspace.accessKeyId);

      const apiKeysClient = new ApiKeys(client);
      const apiKey = await apiKeysClient.createApiKey({
        role: "WORKSPACE_ADMIN"
      });

      const apiKeyId = apiKey.accessKeyId;
      const apiKeySecret = apiKey.accessKeySecret;

      if (!apiKeyId || !apiKeySecret) {
        this.error("API key creation failed.");
      }

      const config = getConfig(CONFIG_FILE);
      const updatedConfig = addWorkspace(
        {
          endpoint: answers.endpoint,
          accessKeyId: apiKeyId,
          accessKeySecret: apiKeySecret,
          workspaceRef: selectedWorkspace.ref,
          workspaceName: selectedWorkspace.name
        },
        config
      );

      saveConfig(CONFIG_FILE, updatedConfig);
      this.log("Done!");
    } catch (error) {
      errorHandler(error, this.error.bind(this));
    }
  }
}
