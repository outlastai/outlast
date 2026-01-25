/**
 * Copyright (C) 2026 by Outlast. MIT License.
 */
import * as fs from "node:fs/promises";
import { confirm, input } from "@inquirer/prompts";
import { Args, Flags } from "@oclif/core";
import { Workflows, type UpdateWorkflowRequest } from "@outlast/sdk";
import { parse as parseYaml } from "yaml";
import { BaseCommand } from "../../BaseCommand.js";
import errorHandler from "../../errorHandler.js";

export default class Update extends BaseCommand<typeof Update> {
  static override readonly description = "update an existing workflow";
  static override readonly examples = [
    "<%= config.bin %> <%= command.id %> <workflow-id>",
    "<%= config.bin %> <%= command.id %> <workflow-id> --from-file workflow.yaml",
    "<%= config.bin %> <%= command.id %> <workflow-id> --name 'New Name'"
  ];

  static override readonly args = {
    id: Args.string({
      description: "The workflow ID to update",
      required: true
    })
  };

  static override readonly flags = {
    "from-file": Flags.string({
      char: "f",
      description: "Path to JSON or YAML workflow definition file"
    }),
    name: Flags.string({
      char: "n",
      description: "New name for the workflow"
    }),
    description: Flags.string({
      char: "d",
      description: "New description"
    }),
    model: Flags.string({
      char: "m",
      description: "New model"
    }),
    schedule: Flags.string({
      char: "s",
      description: "New schedule (cron expression)"
    }),
    interactive: Flags.boolean({
      char: "i",
      description: "Use interactive mode",
      default: false
    })
  };

  public async run(): Promise<void> {
    const client = await this.createClient();
    const { id } = this.args;
    const { "from-file": fromFile, name, description, model, schedule, interactive } = this.flags;

    let updates: UpdateWorkflowRequest = { id };

    if (fromFile) {
      try {
        const content = await fs.readFile(fromFile, "utf-8");
        let fileData: Omit<UpdateWorkflowRequest, "id">;

        if (fromFile.endsWith(".yaml") || fromFile.endsWith(".yml")) {
          fileData = parseYaml(content) as Omit<UpdateWorkflowRequest, "id">;
        } else {
          fileData = JSON.parse(content) as Omit<UpdateWorkflowRequest, "id">;
        }

        updates = { id, ...fileData };
      } catch (e) {
        this.error(`Failed to read file: ${(e as Error).message}`);
      }
    } else if (interactive) {
      this.log("This utility will help you update a Workflow.");
      this.log("Press ^C at any time to quit.");

      const newName = await input({
        message: "New name (leave empty to skip)",
        default: ""
      });
      if (newName) updates.name = newName;

      const newDescription = await input({
        message: "New description (leave empty to skip)",
        default: ""
      });
      if (newDescription) updates.description = newDescription;

      const newModel = await input({
        message: "New model (leave empty to skip)",
        default: ""
      });
      if (newModel) updates.model = newModel;

      const newSchedule = await input({
        message: "New schedule (leave empty to skip)",
        default: ""
      });
      if (newSchedule) updates.schedule = newSchedule;

      const ready = await confirm({
        message: "Ready to update workflow?"
      });

      if (!ready) {
        this.log("Aborted!");
        return;
      }
    } else {
      if (name) updates.name = name;
      if (description) updates.description = description;
      if (model) updates.model = model;
      if (schedule) updates.schedule = schedule;
    }

    if (Object.keys(updates).length === 1) {
      this.log("No updates specified. Use --from-file, --interactive, or provide flags.");
      return;
    }

    try {
      const workflows = new Workflows(client);
      const workflow = await workflows.updateWorkflow(updates);

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
