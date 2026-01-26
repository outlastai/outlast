/**
 * Copyright (C) 2026 by Outlast. MIT License.
 */
import { Flags } from "@oclif/core";
import { Records } from "@outlast/sdk";
import { BaseCommand } from "../../BaseCommand.js";
import errorHandler from "../../errorHandler.js";
import { renderTable, getRecordColumns } from "../../columns/index.js";

export default class List extends BaseCommand<typeof List> {
  static override readonly description = "list records";
  static override readonly examples = [
    "<%= config.bin %> <%= command.id %>",
    "<%= config.bin %> <%= command.id %> --status OPEN",
    "<%= config.bin %> <%= command.id %> --type INVOICE --take 10"
  ];

  static override readonly flags = {
    status: Flags.string({
      char: "s",
      description: "Filter by status (OPEN, DONE, BLOCKED, ARCHIVED)"
    }),
    type: Flags.string({
      char: "t",
      description:
        "Filter by type (GENERIC, PURCHASE_ORDER, INVENTORY_ITEM, INVOICE, SHIPMENT, TICKET, RETURN)"
    }),
    skip: Flags.integer({
      description: "Number of records to skip",
      default: 0
    }),
    take: Flags.integer({
      description: "Maximum number of records to return",
      default: 20
    }),
    json: Flags.boolean({
      description: "Output as JSON",
      default: false
    })
  };

  public async run(): Promise<void> {
    const client = await this.createClient();
    const { status, type, skip, take, json } = this.flags;

    try {
      const records = new Records(client);
      const result = await records.listRecords({
        status: status as "OPEN" | "DONE" | "BLOCKED" | "ARCHIVED" | undefined,
        type: type as
          | "GENERIC"
          | "PURCHASE_ORDER"
          | "INVENTORY_ITEM"
          | "INVOICE"
          | "SHIPMENT"
          | "TICKET"
          | "RETURN"
          | undefined,
        skip,
        take
      });

      if (json) {
        this.log(JSON.stringify(result, null, 2));
        return;
      }

      if (result.length === 0) {
        this.log("No records found.");
        return;
      }

      this.log(renderTable(result, getRecordColumns()));
    } catch (e) {
      errorHandler(e, this.error.bind(this));
    }
  }
}
