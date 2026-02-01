/**
 * Copyright (C) 2026 by Outlast.
 */
import * as fs from "node:fs/promises";
import { checkbox, confirm, input, select } from "@inquirer/prompts";
import { Flags } from "@oclif/core";
import { recordFileSchema, RECORD_TYPE_CHOICES, PRIORITY_CHOICES } from "@outlast/common";
import { Contacts, Records, Workflows, type CreateRecordRequest } from "@outlast/sdk";
import { parse as parseYaml } from "yaml";
import { BaseCommand } from "../../BaseCommand.js";
import errorHandler from "../../errorHandler.js";
import { formatZodErrors } from "../../utils/formatZodErrors.js";

export default class Create extends BaseCommand<typeof Create> {
  static override readonly description = "create a new record";
  static override readonly examples = [
    "<%= config.bin %> <%= command.id %>",
    "<%= config.bin %> <%= command.id %> --from-file record.yaml",
    "<%= config.bin %> <%= command.id %> --from-file record.json",
    "<%= config.bin %> <%= command.id %> --from-file record.yaml --allow-overwrite --overwrite-fields 'status,metadata.amount'"
  ];

  static override readonly flags = {
    "from-file": Flags.string({
      char: "f",
      description: "Path to JSON or YAML record definition file"
    }),
    "allow-overwrite": Flags.boolean({
      description:
        "If a record with the same sourceRecordId exists, update it using overwrite-fields"
    }),
    "overwrite-fields": Flags.string({
      description:
        "Comma-separated list of fields to overwrite when allow-overwrite is set (e.g. status,metadata.sku)"
    })
  };

  public async run(): Promise<void> {
    const client = await this.createClient();
    const {
      "from-file": fromFile,
      "allow-overwrite": allowOverwrite,
      "overwrite-fields": overwriteFieldsStr
    } = this.flags;

    let recordData: CreateRecordRequest;

    if (fromFile) {
      try {
        const content = await fs.readFile(fromFile, "utf-8");
        let rawData: unknown;

        if (fromFile.endsWith(".yaml") || fromFile.endsWith(".yml")) {
          rawData = parseYaml(content);
        } else {
          rawData = JSON.parse(content);
        }

        const parseResult = recordFileSchema.safeParse(rawData);
        if (!parseResult.success) {
          this.error(`Invalid record file:\n${formatZodErrors(parseResult.error)}`);
        }

        const fileData = parseResult.data;
        recordData = {
          title: fileData.title,
          type: fileData.type,
          sourceSystem: "MANUAL",
          sourceRecordId: fileData.sourceRecordId,
          status: fileData.status,
          priority: fileData.priority,
          risk: fileData.risk,
          contactId: fileData.contactId ?? undefined,
          dueAt: fileData.dueAt ?? undefined,
          metadata: fileData.metadata ?? undefined,
          rawData: fileData.rawData ?? undefined,
          workflowIds: fileData.workflowIds
        };

        if (allowOverwrite) {
          recordData.allowOverwrite = true;
          recordData.overwriteFields =
            overwriteFieldsStr
              ?.split(",")
              .map((s) => s.trim())
              .filter(Boolean) ?? [];
          if (recordData.overwriteFields.length === 0) {
            this.error("overwrite-fields is required when allow-overwrite is set");
          }
        }
      } catch (e) {
        if ((e as Error).name === "ExitPromptError") throw e;
        this.error(`Failed to read file: ${(e as Error).message}`);
      }
    } else {
      this.log("This utility will help you create a Record.");
      this.log("Press ^C at any time to quit.");

      const title = await input({
        message: "Title",
        required: true
      });

      const type = await select({
        message: "Type",
        choices: [...RECORD_TYPE_CHOICES]
      });

      const sourceRecordId = await input({
        message: "Source record ID",
        required: true
      });

      const priority = await select({
        message: "Priority",
        default: "LOW",
        choices: [...PRIORITY_CHOICES]
      });

      const contactsResource = new Contacts(client);
      const workflowsResource = new Workflows(client);

      let contactList: { id: string; name: string }[] = [];
      let workflowList: { id: string; name: string }[] = [];

      try {
        contactList = await contactsResource.listContacts({ take: 100 });
        workflowList = await workflowsResource.listWorkflows({ take: 100 });
      } catch {
        // Ignore list errors; user can skip contact/workflow selection
      }

      const contactChoices = [
        { name: "None", value: "" },
        ...contactList.map((c) => ({ name: c.name, value: c.id }))
      ];

      const contactId =
        contactChoices.length > 1
          ? await select({
              message: "Contact (optional)",
              choices: contactChoices
            })
          : "";

      const workflowChoices = workflowList.map((w) => ({ name: w.name, value: w.id }));
      const workflowIds =
        workflowChoices.length > 0
          ? await checkbox({
              message: "Link to workflows (optional)",
              choices: workflowChoices
            })
          : [];

      const ready = await confirm({
        message: "Ready to create record?"
      });

      if (!ready) {
        this.log("Aborted!");
        return;
      }

      recordData = {
        title,
        type: type as CreateRecordRequest["type"],
        sourceSystem: "MANUAL",
        sourceRecordId,
        priority: priority as CreateRecordRequest["priority"],
        contactId: contactId || undefined,
        workflowIds: workflowIds.length > 0 ? workflowIds : undefined
      };
    }

    try {
      const records = new Records(client);
      const record = await records.createRecord(recordData);

      this.log("Done!");
      this.log(`Record ID: ${record.id}`);
      this.log(`Title: ${record.title}`);
    } catch (e) {
      errorHandler(e, this.error.bind(this));
    }
  }
}
