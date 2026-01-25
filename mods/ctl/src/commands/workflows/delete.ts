/**
 * Copyright (C) 2026 by Outlast. MIT License.
 */
import { confirm } from "@inquirer/prompts";
import { Args, Flags } from "@oclif/core";
import { Workflows } from "@outlast/sdk";
import { BaseCommand } from "../../BaseCommand.js";
import errorHandler from "../../errorHandler.js";

export default class Delete extends BaseCommand<typeof Delete> {
  static override readonly description = "delete a workflow";
  static override readonly examples = [
    "<%= config.bin %> <%= command.id %> <workflow-id>",
    "<%= config.bin %> <%= command.id %> <workflow-id> --force"
  ];

  static override readonly args = {
    id: Args.string({
      description: "The workflow ID to delete",
      required: true
    })
  };

  static override readonly flags = {
    force: Flags.boolean({
      char: "f",
      description: "Skip confirmation prompt",
      default: false
    })
  };

  public async run(): Promise<void> {
    const client = await this.createClient();
    const { id } = this.args;
    const { force } = this.flags;

    if (!force) {
      const confirmed = await confirm({
        message: `Are you sure you want to delete workflow ${id}?`,
        default: false
      });

      if (!confirmed) {
        this.log("Aborted!");
        return;
      }
    }

    try {
      const workflows = new Workflows(client);
      const workflow = await workflows.deleteWorkflow({ id });

      this.log("Done!");
      this.log(`Deleted workflow: ${workflow.id}`);
      this.log(`Name: ${workflow.name}`);
    } catch (e) {
      errorHandler(e, this.error.bind(this));
    }
  }
}
