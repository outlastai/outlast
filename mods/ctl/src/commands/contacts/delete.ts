/**
 * Copyright (C) 2026 by Outlast.
 */
import { confirm } from "@inquirer/prompts";
import { Args, Flags } from "@oclif/core";
import { Contacts } from "@outlast/sdk";
import { BaseCommand } from "../../BaseCommand.js";
import errorHandler from "../../errorHandler.js";

export default class Delete extends BaseCommand<typeof Delete> {
  static override readonly description = "delete a contact";
  static override readonly examples = [
    "<%= config.bin %> <%= command.id %> <contact-id>",
    "<%= config.bin %> <%= command.id %> <contact-id> --force"
  ];

  static override readonly args = {
    id: Args.string({
      description: "The contact ID to delete",
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
        message: `Are you sure you want to delete contact ${id}?`,
        default: false
      });

      if (!confirmed) {
        this.log("Aborted!");
        return;
      }
    }

    try {
      const contacts = new Contacts(client);
      const contact = await contacts.deleteContact({ id });

      this.log("Done!");
      this.log(`Deleted contact: ${contact.id}`);
      this.log(`Name: ${contact.name}`);
    } catch (e) {
      errorHandler(e, this.error.bind(this));
    }
  }
}
