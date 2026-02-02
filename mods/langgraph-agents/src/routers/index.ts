/**
 * Copyright (C) 2026 by Outlast.
 *
 * Router functions for LangGraph conditional edges.
 */
export { ROUTER_REGISTRY, registerRouter, getRouter, createRouter } from "./registry.js";

// Import all router modules to trigger registration
import "./callStatus.js";
