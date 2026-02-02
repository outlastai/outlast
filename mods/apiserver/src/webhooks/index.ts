/**
 * Copyright (C) 2026 by Outlast.
 *
 * Webhook routes for external events (email replies, call transcriptions).
 */
import { Router } from "express";
import { emailReplyRouter } from "./emailReply.js";
import { callTranscriptionRouter } from "./callTranscription.js";

const router = Router();

router.use("/email-reply", emailReplyRouter);
router.use("/call-transcription", callTranscriptionRouter);

/** Mount at app.use("/webhooks", webhooksRouter) */
export const webhooksRouter = Router();
webhooksRouter.use("/", router);
