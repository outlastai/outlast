/**
 * Copyright (C) 2026 by Outlast.
 */
import { confirm, input, select } from "@inquirer/prompts";
import { Args, Flags } from "@oclif/core";
import { RECORD_STATUS_CHOICES, PRIORITY_CHOICES } from "@outlast/common";
import { Records, type UpdateRecordRequest } from "@outlast/sdk";
import { BaseCommand } from "../../BaseCommand.js";
import errorHandler from "../../errorHandler.js";

const SKIP_CHOICE = { name: "Skip (no change)", value: "" };

export default class Update extends BaseCommand<typeof Update> {
  static override readonly description = "update an existing record";
  static override readonly examples = [
    "<%= config.bin %> <%= command.id %> <record-id>",
    "<%= config.bin %> <%= command.id %> <record-id> --title 'New Title'",
    "<%= config.bin %> <%= command.id %> <record-id> --status DONE"
  ];

  static override readonly args = {
    id: Args.string({
      description: "The record ID to update",
      required: true
    })
  };

  static override readonly flags = {
    title: Flags.string({
      char: "t",
      description: "New title for the record"
    }),
    status: Flags.string({
      char: "s",
      description: "New status (OPEN, DONE, BLOCKED, ARCHIVED)"
    }),
    priority: Flags.string({
      char: "p",
      description: "New priority (LOW, MEDIUM, HIGH)"
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
    const { title, status, priority, interactive } = this.flags;

    const updates: UpdateRecordRequest = { id };

    if (interactive) {
      this.log("This utility will help you update a Record.");
      this.log("Press ^C at any time to quit.");

      const newTitle = await input({
        message: "New title (leave empty to skip)",
        default: ""
      });
      if (newTitle) updates.title = newTitle;

      const newStatus = await select({
        message: "New status",
        choices: [SKIP_CHOICE, ...RECORD_STATUS_CHOICES]
      });
      if (newStatus) updates.status = newStatus as UpdateRecordRequest["status"];

      const newPriority = await select({
        message: "New priority",
        choices: [SKIP_CHOICE, ...PRIORITY_CHOICES]
      });
      if (newPriority) updates.priority = newPriority as UpdateRecordRequest["priority"];

      const ready = await confirm({
        message: "Ready to update record?"
      });

      if (!ready) {
        this.log("Aborted!");
        return;
      }
    } else {
      if (title) updates.title = title;
      if (status) updates.status = status as UpdateRecordRequest["status"];
      if (priority) updates.priority = priority as UpdateRecordRequest["priority"];
    }

    if (Object.keys(updates).length === 1) {
      this.log("No updates specified. Use --interactive or provide flags.");
      return;
    }

    try {
      const records = new Records(client);
      const record = await records.updateRecord(updates);

      this.log("Done!");
      this.log(`Record ID: ${record.id}`);
      this.log(`Title: ${record.title}`);
      this.log(`Status: ${record.status}`);
    } catch (e) {
      errorHandler(e, this.error.bind(this));
    }
  }
}
