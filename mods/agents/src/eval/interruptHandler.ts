/**
 * Copyright (C) 2026 by Outlast.
 *
 * Consumes mock resume data for interrupts in order (FIFO).
 */
import type { EvalInterruptResume } from "@outlast/common";

/**
 * Create an interrupt handler that returns mock resume data in order.
 * Each call to next() returns the next item in the list.
 */
export function createInterruptHandler(interrupts: EvalInterruptResume[] = []): {
  next: () => {
    channel: string;
    content: string;
    channelMessageId?: string;
    timeout?: boolean;
    metadata?: Record<string, unknown>;
  };
  hasMore: () => boolean;
  remaining: () => number;
} {
  let index = 0;

  return {
    next() {
      const item = interrupts[index];
      index += 1;
      if (!item?.resume) {
        return {
          channel: "EMAIL",
          content: "",
          timeout: true
        };
      }
      const r = item.resume;
      if (typeof r === "object" && r !== null && "channel" in r) {
        return {
          channel: (r as { channel?: string }).channel ?? "EMAIL",
          content: (r as { content?: string }).content ?? "",
          channelMessageId: (r as { channelMessageId?: string }).channelMessageId,
          timeout: (r as { timeout?: boolean }).timeout,
          metadata: (r as { metadata?: Record<string, unknown> }).metadata
        };
      }
      return { channel: "EMAIL", content: "" };
    },
    hasMore: () => index < interrupts.length,
    remaining: () => Math.max(0, interrupts.length - index)
  };
}
