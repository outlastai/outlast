/**
 * Copyright (C) 2026 by Outlast.
 *
 * Node functions for LangGraph workflows.
 */
export { NODE_REGISTRY, registerNode, getNode, createNode } from "./registry.js";

// Import all node modules to trigger registration
import "./makePhoneCall.js";
import "./waitFonoster.js";
import "./sendEmail.js";
import "./escalate.js";
import "./finishRecord.js";
