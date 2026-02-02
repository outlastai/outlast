/**
 * Copyright (C) 2026 by Outlast.
 *
 * Evaluate workflow using evals from workflow file or API.
 */
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { Args, Flags } from "@oclif/core";
import { workflowFileSchema } from "@outlast/common";
import { runWorkflowEval, streamEvalEvents, printEvalResults, toJSON } from "@outlast/agents";
import { parse as parseYaml } from "yaml";
import { BaseCommand } from "../../BaseCommand.js";
import errorHandler from "../../errorHandler.js";
import { formatZodErrors } from "../../utils/formatZodErrors.js";

export default class Eval extends BaseCommand<typeof Eval> {
  static override readonly description =
    "evaluate a workflow using evals defined in the workflow file";
  static override readonly args = {
    workflowId: Args.string({
      description: "Workflow ID (fetch from API; evals must be stored with workflow)",
      required: false
    })
  };

  static override readonly examples = [
    "<%= config.bin %> <%= command.id %> --file workflow.yaml",
    "<%= config.bin %> <%= command.id %> abc-123",
    "<%= config.bin %> <%= command.id %> --file workflow.yaml --scenario happy-path",
    "<%= config.bin %> <%= command.id %> --file workflow.yaml --format json"
  ];

  static override readonly flags = {
    file: Flags.string({
      char: "f",
      description:
        "Path to workflow YAML file (must include evals section; use when workflow ID does not have evals in API)"
    }),
    scenario: Flags.string({
      char: "s",
      description: "Run only this scenario by id"
    }),
    format: Flags.string({
      description: "Output format: stream (default) or json",
      options: ["stream", "json"],
      default: "stream"
    })
  };

  public async run(): Promise<void> {
    const { file: filePath, scenario: scenarioId, format } = this.flags;
    const { workflowId } = this.args;

    try {
      type WorkflowFileData = {
        name: string;
        model?: string | null;
        systemPrompt?: string | null;
        temperature?: number | null;
        tools?: string[] | null;
        entrypoint?: string;
        nodes?: Record<string, unknown>;
      };
      let workflowFile: WorkflowFileData;
      let evalsSection: { scenarios: unknown[] };

      if (filePath) {
        const content = await fs.readFile(path.resolve(filePath), "utf-8");
        const rawData = parseYaml(content);
        const parseResult = workflowFileSchema.safeParse(rawData);
        if (!parseResult.success) {
          this.error(`Invalid workflow file:\n${formatZodErrors(parseResult.error)}`);
        }
        workflowFile = parseResult.data as WorkflowFileData;
        evalsSection = (workflowFile as { evals?: { scenarios: unknown[] } }).evals ?? {
          scenarios: []
        };
      } else if (workflowId) {
        const client = await this.createClient();
        const { Workflows } = await import("@outlast/sdk");
        const workflows = new Workflows(client);
        const list = await workflows.listWorkflows({ take: 500 });
        const w = list.find((x) => x.id === workflowId);
        if (!w) this.error(`Workflow not found: ${workflowId}`);
        workflowFile = {
          name: w.name,
          model: w.model ?? null,
          systemPrompt: w.systemPrompt ?? null,
          temperature: w.temperature ?? 0.7,
          tools: Array.isArray(w.tools) ? (w.tools as string[]) : null
        };
        if (w.graphDefinition) {
          (workflowFile as { entrypoint?: string; nodes?: Record<string, unknown> }).entrypoint =
            w.graphDefinition.entrypoint;
          (workflowFile as { entrypoint?: string; nodes?: Record<string, unknown> }).nodes =
            w.graphDefinition.nodes;
        }
        evalsSection = (w as { evals?: { scenarios: unknown[] } }).evals ?? { scenarios: [] };
      } else {
        this.error(
          "Provide either --file path or workflow ID (e.g. ol workflows:eval --file workflow.yaml)"
        );
      }

      if (!evalsSection?.scenarios?.length) {
        this.error(
          "No evals.scenarios found. Add an evals section with scenarios to the workflow file or store evals with the workflow in the API."
        );
      }

      const openaiApiKey = process.env.OPENAI_API_KEY;
      if (!openaiApiKey) {
        this.error(
          "OPENAI_API_KEY environment variable is required for eval (LLM calls are live)."
        );
      }

      const workflowConfig: {
        id: string;
        name: string;
        model: string | null;
        systemPrompt: string | null;
        temperature: number | null;
        tools: string[] | null;
        graphDefinition?: { entrypoint: string; nodes: Record<string, unknown> } | null;
      } = {
        id: workflowId ?? "eval-workflow",
        name: workflowFile.name,
        model: workflowFile.model ?? "gpt-4o",
        systemPrompt: workflowFile.systemPrompt ?? null,
        temperature: workflowFile.temperature ?? 0.7,
        tools: workflowFile.tools ?? ["sendEmail", "sendCall", "getRecord", "updateRecordStatus"]
      };
      if (workflowFile.entrypoint && workflowFile.nodes) {
        workflowConfig.graphDefinition = {
          entrypoint: workflowFile.entrypoint,
          nodes: workflowFile.nodes
        };
      }

      const onEvent =
        format === "stream" ? streamEvalEvents(undefined, { verbose: true }) : undefined;

      const results = await runWorkflowEval(
        workflowConfig,
        evalsSection.scenarios as Parameters<typeof runWorkflowEval>[1],
        {
          openaiApiKey,
          onEvent,
          scenarioId: scenarioId ?? undefined
        }
      );

      if (format === "json") {
        this.log(toJSON(results));
        return;
      }

      printEvalResults(results);

      if (results.summary.failedScenarios > 0) {
        this.exit(1);
      }
    } catch (e) {
      // Re-throw oclif exit errors - these are expected control flow, not real errors
      const err = e as Error & { code?: string };
      if (err.code === "EEXIT") {
        throw e;
      }
      if ((e as Error).name === "ExitPromptError") throw e;
      errorHandler(e, this.error.bind(this));
    }
  }

  /** Suppress "Error: EEXIT: 0" when command exits successfully. */
  protected override async catch(
    err: Error & { exitCode?: number; code?: string; oclif?: { exit?: number } }
  ) {
    // oclif throws EEXIT errors when this.exit() is called
    // Check multiple property patterns that oclif uses across versions
    const isExitZero =
      err.exitCode === 0 ||
      err.oclif?.exit === 0 ||
      (err.code === "EEXIT" && err.message === "EEXIT: 0") ||
      err.message?.includes("EEXIT: 0");

    if (isExitZero) {
      return;
    }
    return super.catch(err);
  }
}
