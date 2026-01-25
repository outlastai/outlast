/**
 * Copyright (C) 2026 by Outlast. MIT License.
 */
import { Command, Interfaces } from "@oclif/core";
import { Client } from "@outlast/sdk";
import { getActiveWorkspace, getConfig } from "./config/index.js";
import { CONFIG_FILE } from "./constants.js";

export type Args<T extends typeof Command> = Interfaces.InferredArgs<T["args"]>;

export abstract class BaseCommand<T extends typeof Command> extends Command {
  protected flags!: Flags<T>;
  protected args!: Args<T>;

  public async init(): Promise<void> {
    await super.init();
    const { args, flags } = await this.parse({
      flags: this.ctor.flags,
      baseFlags: (super.ctor as typeof BaseCommand).baseFlags,
      enableJsonFlag: this.ctor.enableJsonFlag,
      args: this.ctor.args,
      strict: this.ctor.strict
    });
    this.flags = flags as Flags<T>;
    this.args = args as Args<T>;
  }

  protected async createClient() {
    const workspaces = getConfig(CONFIG_FILE);
    const activeWorkspace = getActiveWorkspace(workspaces);

    if (!activeWorkspace) {
      this.error("No active workspace. Run 'ol workspaces:login' first.");
    }

    const client = new Client({ endpoint: activeWorkspace.endpoint });
    await client.loginWithApiKey(activeWorkspace.accessKeyId, activeWorkspace.accessKeySecret);
    return client;
  }

  protected async catch(err: Error & { exitCode?: number }) {
    return super.catch(err);
  }

  protected async finally(_: Error | undefined) {
    return super.finally(_);
  }
}

export type Flags<T extends typeof Command> = Interfaces.InferredFlags<
  (typeof BaseCommand)["baseFlags"] & T["flags"]
>;
