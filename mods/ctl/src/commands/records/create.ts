/**
 * Copyright (C) 2026 by Outlast.
 */
import { confirm, input } from "@inquirer/prompts";
import { Records } from "@outlast/sdk";
import { BaseCommand } from "../../BaseCommand.js";
import errorHandler from "../../errorHandler.js";

export default class Create extends BaseCommand<typeof Create> {
  static override readonly description = "create a new record";
  static override readonly examples = ["<%= config.bin %> <%= command.id %>"];

  public async run(): Promise<void> {
    const client = await this.createClient();

    this.log("This utility will help you create a Record.");
    this.log("Press ^C at any time to quit.");

    const answers = {
      title: await input({
        message: "Title",
        required: true
      })
    };

    const ready = await confirm({
      message: "Ready to create record?"
    });

    if (!ready) {
      this.log("Aborted!");
      return;
    }

    try {
      const records = new Records(client);
      const record = await records.createRecord({
        title: answers.title
      });

      this.log("Done!");
      this.log(`Record ID: ${record.id}`);
      this.log(`Title: ${record.title}`);
    } catch (e) {
      errorHandler(e, this.error.bind(this));
    }
  }
}
