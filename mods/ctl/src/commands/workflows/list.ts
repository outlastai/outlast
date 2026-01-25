/**
 * Copyright (C) 2026 by Outlast. MIT License.
 */
import { Flags } from "@oclif/core";
import { Workflows } from "@outlast/sdk";
import { BaseCommand } from "../../BaseCommand.js";
import errorHandler from "../../errorHandler.js";

export default class List extends BaseCommand<typeof List> {
  static override readonly description = "list workflows";
  static override readonly examples = [
    "<%= config.bin %> <%= command.id %>",
    "<%= config.bin %> <%= command.id %> --take 10"
  ];

  static override readonly flags = {
    skip: Flags.integer({
      description: "Number of workflows to skip",
      default: 0
    }),
    take: Flags.integer({
      description: "Maximum number of workflows to return",
      default: 20
    }),
    json: Flags.boolean({
      description: "Output as JSON",
      default: false
    })
  };

  public async run(): Promise<void> {
    const client = await this.createClient();
    const { skip, take, json } = this.flags;

    try {
      const workflows = new Workflows(client);
      const result = await workflows.listWorkflows({
        skip,
        take
      });

      if (json) {
        this.log(JSON.stringify(result, null, 2));
        return;
      }

      if (result.length === 0) {
        this.log("No workflows found.");
        return;
      }

      this.log(`Found ${result.length} workflow(s):\n`);

      for (const workflow of result) {
        this.log(`ID: ${workflow.id}`);
        this.log(`  Name: ${workflow.name}`);
        if (workflow.description) this.log(`  Description: ${workflow.description}`);
        if (workflow.model) this.log(`  Model: ${workflow.model}`);
        if (workflow.schedule) this.log(`  Schedule: ${workflow.schedule}`);
        this.log(`  Created: ${new Date(workflow.createdAt).toLocaleString()}`);
        this.log("");
      }
    } catch (e) {
      errorHandler(e, this.error.bind(this));
    }
  }
}
