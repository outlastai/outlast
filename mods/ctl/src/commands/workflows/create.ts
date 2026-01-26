/**
 * Copyright (C) 2026 by Outlast. MIT License.
 */
import * as fs from "node:fs/promises";
import { confirm, input, editor } from "@inquirer/prompts";
import { Flags } from "@oclif/core";
import { workflowFileSchema } from "@outlast/common";
import { Workflows, type CreateWorkflowRequest } from "@outlast/sdk";
import { parse as parseYaml } from "yaml";
import { BaseCommand } from "../../BaseCommand.js";
import errorHandler from "../../errorHandler.js";
import { formatZodErrors } from "../../utils/formatZodErrors.js";

export default class Create extends BaseCommand<typeof Create> {
  static override readonly description = "create a new workflow";
  static override readonly examples = [
    "<%= config.bin %> <%= command.id %>",
    "<%= config.bin %> <%= command.id %> --from-file workflow.yaml",
    "<%= config.bin %> <%= command.id %> --from-file workflow.json"
  ];

  static override readonly flags = {
    "from-file": Flags.string({
      char: "f",
      description: "Path to JSON or YAML workflow definition file"
    })
  };

  public async run(): Promise<void> {
    const client = await this.createClient();
    const { "from-file": fromFile } = this.flags;

    let workflowData: CreateWorkflowRequest;

    if (fromFile) {
      try {
        const content = await fs.readFile(fromFile, "utf-8");
        let rawData: unknown;

        if (fromFile.endsWith(".yaml") || fromFile.endsWith(".yml")) {
          rawData = parseYaml(content);
        } else {
          rawData = JSON.parse(content);
        }

        // Validate with Zod schema
        const parseResult = workflowFileSchema.safeParse(rawData);
        if (!parseResult.success) {
          this.error(`Invalid workflow file:\n${formatZodErrors(parseResult.error)}`);
        }

        workflowData = parseResult.data as CreateWorkflowRequest;
      } catch (e) {
        if ((e as Error).name === "ExitPromptError") throw e;
        this.error(`Failed to read file: ${(e as Error).message}`);
      }
    } else {
      this.log("This utility will help you create a Workflow.");
      this.log("Press ^C at any time to quit.");

      const name = await input({
        message: "Name",
        required: true
      });

      const description = await input({
        message: "Description (optional)",
        default: ""
      });

      const model = await input({
        message: "Model (e.g., gpt-4, claude-3)",
        default: ""
      });

      const systemPrompt = await editor({
        message: "System Prompt (opens editor, optional)"
      });

      const temperatureStr = await input({
        message: "Temperature (0-2, optional)",
        default: ""
      });

      const schedule = await input({
        message: "Schedule (cron expression, optional)",
        default: ""
      });

      const ready = await confirm({
        message: "Ready to create workflow?"
      });

      if (!ready) {
        this.log("Aborted!");
        return;
      }

      workflowData = {
        name,
        description: description || null,
        model: model || null,
        systemPrompt: systemPrompt?.trim() || null,
        temperature: temperatureStr ? parseFloat(temperatureStr) : null,
        schedule: schedule || null
      };
    }

    try {
      const workflows = new Workflows(client);
      const workflow = await workflows.createWorkflow(workflowData);

      this.log("Done!");
      this.log(`Workflow ID: ${workflow.id}`);
      this.log(`Name: ${workflow.name}`);
      if (workflow.description) this.log(`Description: ${workflow.description}`);
      if (workflow.model) this.log(`Model: ${workflow.model}`);
      if (workflow.schedule) this.log(`Schedule: ${workflow.schedule}`);
    } catch (e) {
      errorHandler(e, this.error.bind(this));
    }
  }
}
