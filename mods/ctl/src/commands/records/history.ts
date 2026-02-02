/**
 * Copyright (C) 2026 by Outlast.
 */
import { Args, Flags } from "@oclif/core";
import { Records } from "@outlast/sdk";
import { BaseCommand } from "../../BaseCommand.js";
import errorHandler from "../../errorHandler.js";

export default class History extends BaseCommand<typeof History> {
  static override readonly description = "show history for a record";
  static override readonly examples = [
    "<%= config.bin %> <%= command.id %> <record-id>",
    "<%= config.bin %> <%= command.id %> <record-id> --take 5"
  ];

  static override readonly args = {
    id: Args.string({
      description: "The record ID to get history for",
      required: true
    })
  };

  static override readonly flags = {
    skip: Flags.integer({
      description: "Number of history entries to skip",
      default: 0
    }),
    take: Flags.integer({
      description: "Maximum number of history entries to return",
      default: 20
    }),
    json: Flags.boolean({
      description: "Output as JSON",
      default: false
    })
  };

  public async run(): Promise<void> {
    const client = await this.createClient();
    const { id } = this.args;
    const { skip, take, json } = this.flags;

    try {
      const records = new Records(client);
      const result = await records.getRecordHistory({
        recordId: id,
        skip,
        take
      });

      if (json) {
        this.log(JSON.stringify(result, null, 2));
        return;
      }

      if (result.messages.length === 0) {
        this.log("No history found for this record.");
        return;
      }

      this.log(
        `Found ${result.messages.length} message(s) · ${result.attempts} attempt(s) · last channel: ${result.lastChannel ?? "—"}\n`
      );

      for (let i = 0; i < result.messages.length; i++) {
        const msg = result.messages[i];
        this.log(`[${i + 1}] ${msg.role}${msg.channel ? ` (${msg.channel})` : ""}`);
        this.log(`  ${msg.content}`);
        this.log("");
      }
    } catch (e) {
      errorHandler(e, this.error.bind(this));
    }
  }
}
