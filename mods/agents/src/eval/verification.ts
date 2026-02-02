/**
 * Copyright (C) 2026 by Outlast.
 *
 * Verify eval results against expected outcomes.
 */
import type { EvalExpected } from "@outlast/common";
import type { ToolCallRecord } from "./mockToolExecutor.js";
import { compareArgs } from "./judge.js";

export interface VerificationResult {
  nodeSequence: { passed: boolean; expected: string[]; actual: string[]; reason?: string };
  finalState: { passed: boolean; reason?: string };
  record: { passed: boolean; expected?: string; actual?: string; reason?: string };
  toolsCalled: {
    passed: boolean;
    details: Array<{ name: string; passed: boolean; reason?: string }>;
  };
  llmResponses: {
    passed: boolean;
    details: Array<{ node: string; passed: boolean; reason?: string }>;
  };
  allPassed: boolean;
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== "object" || typeof b !== "object") return false;
  const aObj = a as Record<string, unknown>;
  const bObj = b as Record<string, unknown>;
  const keys = new Set([...Object.keys(aObj), ...Object.keys(bObj)]);
  for (const k of keys) {
    if (!deepEqual(aObj[k], bObj[k])) return false;
  }
  return true;
}

/**
 * Verify scenario results against expected outcomes.
 */
export async function verifyScenario(
  expected: EvalExpected,
  context: {
    nodeSequence: string[];
    finalState: Record<string, unknown>;
    recordStatus?: string;
    toolCalls: ToolCallRecord[];
    llmResponsesByNode?: Record<string, string[]>;
  },
  options: { apiKey?: string } = {}
): Promise<VerificationResult> {
  const details: VerificationResult = {
    nodeSequence: {
      passed: true,
      expected: expected.nodeSequence ?? [],
      actual: context.nodeSequence
    },
    finalState: { passed: true },
    record: { passed: true },
    toolsCalled: { passed: true, details: [] },
    llmResponses: { passed: true, details: [] },
    allPassed: true
  };

  // Node sequence
  if (expected.nodeSequence && expected.nodeSequence.length > 0) {
    const exp = expected.nodeSequence;
    const act = context.nodeSequence;
    details.nodeSequence.passed =
      act.length === exp.length && exp.every((n: string, i: number) => act[i] === n);
    if (!details.nodeSequence.passed) {
      details.nodeSequence.reason = `Expected ${exp.join(" -> ")}, got ${act.join(" -> ")}`;
      details.allPassed = false;
    }
  }

  // Final state
  if (expected.finalState && Object.keys(expected.finalState).length > 0) {
    for (const [key, value] of Object.entries(expected.finalState)) {
      if (context.finalState[key] !== value) {
        details.finalState.passed = false;
        details.finalState.reason = `Expected finalState.${key}=${value}, got ${context.finalState[key]}`;
        details.allPassed = false;
        break;
      }
    }
  }

  // Record status
  if (expected.record?.status) {
    details.record.expected = expected.record.status;
    details.record.actual = context.recordStatus;
    details.record.passed = context.recordStatus === expected.record.status;
    if (!details.record.passed) {
      details.record.reason = `Expected record.status=${expected.record.status}, got ${context.recordStatus}`;
      details.allPassed = false;
    }
  }

  // Tools called
  const expectedTools = expected.toolsCalled ?? [];
  for (const exp of expectedTools) {
    const call = context.toolCalls.find((c) => c.name === exp.name);
    let passed = false;
    let reason: string | undefined;
    if (!call) {
      reason = "Tool was not called";
    } else {
      const matchMode = exp.matchMode ?? "strict";
      if (matchMode === "strict") {
        passed = exp.args == null || deepEqual(exp.args, call.args);
        if (!passed)
          reason = `Args mismatch: expected ${JSON.stringify(exp.args)}, got ${JSON.stringify(call.args)}`;
      } else {
        const result = await compareArgs((exp.args ?? {}) as Record<string, unknown>, call.args, {
          apiKey: options.apiKey ?? ""
        });
        passed = result.match;
        reason = result.reason;
      }
    }
    details.toolsCalled.details.push({ name: exp.name, passed, reason });
    if (!passed) {
      details.toolsCalled.passed = false;
      details.allPassed = false;
    }
  }
  if (expectedTools.length === 0 && details.toolsCalled.details.length === 0) {
    details.toolsCalled.passed = true;
  }

  // LLM responses (contains check)
  const llmExpected = expected.llmResponses ?? [];
  const llmByNode = context.llmResponsesByNode ?? {};
  for (const exp of llmExpected) {
    const contents = llmByNode[exp.node] ?? [];
    const text = contents.join(" ");
    const contains = exp.contains ?? [];
    const passed =
      contains.length === 0 ||
      contains.every((c: string) => text.toLowerCase().includes(c.toLowerCase()));
    details.llmResponses.details.push({
      node: exp.node,
      passed,
      reason: passed ? undefined : `Expected to contain [${contains.join(", ")}]`
    });
    if (!passed) {
      details.llmResponses.passed = false;
      details.allPassed = false;
    }
  }

  return details;
}
