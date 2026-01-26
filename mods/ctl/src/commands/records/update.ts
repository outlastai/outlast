/**
 * Copyright (C) 2026 by Outlast.
 */
import { confirm, input, select } from "@inquirer/prompts";
import { Args, Flags } from "@oclif/core";
import { Records } from "@outlast/sdk";
import { BaseCommand } from "../../BaseCommand.js";
import errorHandler from "../../errorHandler.js";

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
    type: Flags.string({
      description:
        "New type (GENERIC, PURCHASE_ORDER, INVENTORY_ITEM, INVOICE, SHIPMENT, TICKET, RETURN)"
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
    const { title, status, type, priority, interactive } = this.flags;

    const updates: {
      id: string;
      title?: string;
      status?: "OPEN" | "DONE" | "BLOCKED" | "ARCHIVED";
      type?:
        | "GENERIC"
        | "PURCHASE_ORDER"
        | "INVENTORY_ITEM"
        | "INVOICE"
        | "SHIPMENT"
        | "TICKET"
        | "RETURN";
      priority?: "LOW" | "MEDIUM" | "HIGH" | null;
    } = { id };

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
        choices: [
          { name: "Skip (no change)", value: "" },
          { name: "OPEN", value: "OPEN" },
          { name: "DONE", value: "DONE" },
          { name: "BLOCKED", value: "BLOCKED" },
          { name: "ARCHIVED", value: "ARCHIVED" }
        ]
      });
      if (newStatus) updates.status = newStatus as "OPEN" | "DONE" | "BLOCKED" | "ARCHIVED";

      const ready = await confirm({
        message: "Ready to update record?"
      });

      if (!ready) {
        this.log("Aborted!");
        return;
      }
    } else {
      if (title) updates.title = title;
      if (status) updates.status = status as "OPEN" | "DONE" | "BLOCKED" | "ARCHIVED";
      if (type)
        updates.type = type as
          | "GENERIC"
          | "PURCHASE_ORDER"
          | "INVENTORY_ITEM"
          | "INVOICE"
          | "SHIPMENT"
          | "TICKET"
          | "RETURN";
      if (priority) updates.priority = priority as "LOW" | "MEDIUM" | "HIGH";
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
