/**
 * Copyright (C) 2026 by Outlast.
 *
 * Streaming and formatted output for workflow eval.
 */
import type { EvalEvent } from "./runner.js";
import type { ScenarioResult, EvalResults } from "./runner.js";

/**
 * Return a handler that formats and streams eval events to console.
 */
export function streamEvalEvents(
  _extraCallback?: (event: EvalEvent) => void,
  options: { verbose?: boolean } = {}
): (event: EvalEvent) => void {
  const { verbose = true } = options;
  return (event: EvalEvent) => {
    _extraCallback?.(event);
    if (!verbose) return;
    switch (event.type) {
      case "node:start":
        if (event.node) {
          console.log(`\n▶ Node: ${event.node}`);
        }
        break;
      case "node:complete":
        if (event.node && event.state) {
          const st = event.state as { messages?: Array<{ role: string; content: string }> };
          const lastMsg = st.messages?.slice(-1)[0];
          if (lastMsg?.content) {
            const preview =
              lastMsg.content.substring(0, 120) + (lastMsg.content.length > 120 ? "..." : "");
            console.log(`  ├─ ${lastMsg.role}: ${preview}`);
          }
          console.log(`  └─ ✓ Complete`);
        }
        break;
      case "interrupt:resume":
        console.log(`  ├─ Interrupt: resuming with mock data...`);
        if (event.data && typeof event.data === "object" && "content" in event.data) {
          const d = event.data as { content?: string };
          console.log(`  │  └─ "${(d.content ?? "").substring(0, 80)}..."`);
        }
        console.log(`  └─ ✓ Resumed`);
        break;
      case "scenario:complete":
        console.log(`\n  Scenario complete.`);
        break;
      default:
        break;
    }
  };
}

/**
 * Print verification section for a scenario result.
 */
export function printVerification(result: ScenarioResult): void {
  const v = result.verification;
  console.log("\n════════════════════════════════════════════════════════════════");
  console.log("                        VERIFICATION");
  console.log("════════════════════════════════════════════════════════════════\n");

  const pass = (b: boolean) => (b ? "✓ PASS" : "✘ FAIL");
  console.log(
    `Node Sequence     ${pass(v.nodeSequence.passed)}  ${v.nodeSequence.actual?.length ?? 0} nodes`
  );
  if (!v.nodeSequence.passed && v.nodeSequence.reason) {
    console.log(`  └─ ${v.nodeSequence.reason}`);
  }
  console.log(
    `Final State       ${pass(v.finalState.passed)}${v.finalState.reason ? `  ${v.finalState.reason}` : ""}`
  );
  console.log(
    `Record Status     ${pass(v.record.passed)}${v.record.reason ? `  ${v.record.reason}` : ""}`
  );
  console.log(
    `Tools Called      ${pass(v.toolsCalled.passed)}  ${v.toolsCalled.details.length} expected`
  );
  for (const d of v.toolsCalled.details) {
    console.log(`  └─ ${d.name}  ${pass(d.passed)}${d.reason ? `  ${d.reason}` : ""}`);
  }
  console.log(`LLM Quality       ${pass(v.llmResponses.passed)}`);
  for (const d of v.llmResponses.details) {
    console.log(`  └─ ${d.node}  ${pass(d.passed)}${d.reason ? `  ${d.reason}` : ""}`);
  }
  console.log("\n════════════════════════════════════════════════════════════════");
  console.log(`Scenario: ${result.scenario.id}    ${result.passed ? "✓ PASSED" : "✘ FAILED"}`);
  console.log("════════════════════════════════════════════════════════════════\n");
}

/**
 * Print full eval results (all scenarios).
 */
export function printEvalResults(results: EvalResults): void {
  console.log("\n╔══════════════════════════════════════════════════════════════╗");
  console.log(`║  Evaluating: ${results.workflowName.padEnd(50)}║`);
  console.log("╚══════════════════════════════════════════════════════════════╝\n");

  for (const scenarioResult of results.scenarios) {
    console.log(`\nScenario: ${scenarioResult.scenario.id}`);
    console.log(scenarioResult.scenario.description ?? "");
    if (scenarioResult.error) {
      console.log(`  ✘ Error: ${scenarioResult.error}`);
    }
    printVerification(scenarioResult);
  }

  const { summary } = results;
  console.log("════════════════════════════════════════════════════════════════");
  console.log("                        SUMMARY");
  console.log("════════════════════════════════════════════════════════════════");
  console.log(`Workflow: ${results.workflowName}`);
  console.log(`Scenarios: ${summary.passedScenarios}/${summary.totalScenarios} passed`);
  console.log("");
}

/**
 * Format eval results as JSON string.
 */
export function toJSON(results: EvalResults): string {
  return JSON.stringify(
    {
      workflowId: results.workflowId,
      workflowName: results.workflowName,
      summary: results.summary,
      scenarios: results.scenarios.map((s) => ({
        id: s.scenario.id,
        passed: s.passed,
        nodeSequence: s.nodeSequence,
        verification: s.verification,
        error: s.error
      }))
    },
    null,
    2
  );
}
