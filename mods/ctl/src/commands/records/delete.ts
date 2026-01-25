/**
 * Copyright (C) 2026 by Outlast. MIT License.
 */
import { confirm } from "@inquirer/prompts";
import { Args, Flags } from "@oclif/core";
import { Records } from "@outlast/sdk";
import { BaseCommand } from "../../BaseCommand.js";
import errorHandler from "../../errorHandler.js";

export default class Delete extends BaseCommand<typeof Delete> {
  static override readonly description = "delete a record";
  static override readonly examples = [
    "<%= config.bin %> <%= command.id %> <record-id>",
    "<%= config.bin %> <%= command.id %> <record-id> --force"
  ];

  static override readonly args = {
    id: Args.string({
      description: "The record ID to delete",
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
        message: `Are you sure you want to delete record ${id}?`,
        default: false
      });

      if (!confirmed) {
        this.log("Aborted!");
        return;
      }
    }

    try {
      const records = new Records(client);
      const record = await records.deleteRecord({ id });

      this.log("Done!");
      this.log(`Deleted record: ${record.id}`);
      this.log(`Title: ${record.title}`);
    } catch (e) {
      errorHandler(e, this.error.bind(this));
    }
  }
}
