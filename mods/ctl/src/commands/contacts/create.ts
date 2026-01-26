/**
 * Copyright (C) 2026 by Outlast.
 */
import { confirm, input, select } from "@inquirer/prompts";
import { Contacts } from "@outlast/sdk";
import { BaseCommand } from "../../BaseCommand.js";
import errorHandler from "../../errorHandler.js";

export default class Create extends BaseCommand<typeof Create> {
  static override readonly description = "create a new contact";
  static override readonly examples = ["<%= config.bin %> <%= command.id %>"];

  public async run(): Promise<void> {
    const client = await this.createClient();

    this.log("This utility will help you create a Contact.");
    this.log("Press ^C at any time to quit.");

    const name = await input({
      message: "Name",
      required: true
    });

    const email = await input({
      message: "Email (optional)",
      default: ""
    });

    const phone = await input({
      message: "Phone (optional)",
      default: ""
    });

    const preferredChannel = await select({
      message: "Preferred contact channel",
      choices: [
        { name: "Email", value: "EMAIL" },
        { name: "Phone", value: "PHONE" },
        { name: "SMS", value: "SMS" },
        { name: "WhatsApp", value: "WHATSAPP" }
      ]
    });

    const ready = await confirm({
      message: "Ready to create contact?"
    });

    if (!ready) {
      this.log("Aborted!");
      return;
    }

    try {
      const contacts = new Contacts(client);
      const contact = await contacts.createContact({
        name,
        email: email || null,
        phone: phone || null,
        preferredChannel: preferredChannel as "EMAIL" | "PHONE" | "SMS" | "WHATSAPP"
      });

      this.log("Done!");
      this.log(`Contact ID: ${contact.id}`);
      this.log(`Name: ${contact.name}`);
      this.log(`Email: ${contact.email ?? "Not set"}`);
      this.log(`Phone: ${contact.phone ?? "Not set"}`);
      this.log(`Preferred Channel: ${contact.preferredChannel}`);
    } catch (e) {
      errorHandler(e, this.error.bind(this));
    }
  }
}
