/**
 * Copyright (C) 2026 by Outlast.
 *
 * Webhook handler for email replies. Resumes a paused workflow with the reply content.
 */
import { Router, type Request, type Response } from "express";
import { createResumeWorkflow } from "../api/workflows/langgraph.js";
import { getCheckpointer } from "../checkpointer.js";
import { prisma } from "../db.js";
import { logger } from "../logger.js";

const router = Router();

const channel = "EMAIL" as const;

/** Body shape for email reply webhook. */
interface EmailReplyBody {
  recordId: string;
  workflowId?: string;
  content: string;
  channelMessageId?: string;
  metadata?: Record<string, unknown>;
}

function isValidBody(b: unknown): b is EmailReplyBody {
  return (
    typeof b === "object" &&
    b !== null &&
    "recordId" in b &&
    typeof (b as EmailReplyBody).recordId === "string" &&
    "content" in b &&
    typeof (b as EmailReplyBody).content === "string"
  );
}

/**
 * POST /webhooks/email-reply
 * Resumes a workflow waiting for an email response.
 * Body: { recordId, workflowId?, content, channelMessageId?, metadata? }
 * Optional header: x-webhook-secret (must match OUTLAST_WEBHOOK_SECRET if set)
 */
router.post("/", async (req: Request, res: Response) => {
  const secret = process.env.OUTLAST_WEBHOOK_SECRET;
  if (secret) {
    const provided = req.headers["x-webhook-secret"];
    if (provided !== secret) {
      logger.warn("webhook email-reply: invalid or missing secret");
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
  }

  if (!isValidBody(req.body)) {
    res.status(400).json({
      error: "Bad request",
      message: "Body must include recordId (string) and content (string)"
    });
    return;
  }

  const { recordId, workflowId, content, channelMessageId, metadata } = req.body as EmailReplyBody;

  try {
    const record = await prisma.record.findUnique({
      where: { id: recordId },
      select: { workspaceId: true }
    });
    if (!record) {
      res.status(404).json({ error: "Record not found", recordId });
      return;
    }

    const checkpointer = getCheckpointer();
    if (!checkpointer) {
      logger.error("webhook email-reply: checkpointer not configured");
      res.status(503).json({ error: "Service unavailable" });
      return;
    }

    const resume = createResumeWorkflow(
      prisma as unknown as Parameters<typeof createResumeWorkflow>[0],
      checkpointer,
      record.workspaceId
    );
    await resume({
      recordId,
      workflowId,
      response: {
        channel,
        content,
        channelMessageId,
        metadata
      }
    });

    logger.info("webhook email-reply: resumed", { recordId });
    res.status(200).json({ ok: true });
  } catch (err) {
    logger.error("webhook email-reply failed", {
      error: err instanceof Error ? err.message : String(err),
      recordId
    });
    res.status(500).json({
      error: "Internal server error",
      message: err instanceof Error ? err.message : String(err)
    });
  }
});

export { router as emailReplyRouter };
