/**
 * Copyright (C) 2026 by Outlast.
 */
import { homedir } from "os";
import { join } from "path";

export const BASE_DIR = join(homedir(), ".outlast");
export const CONFIG_FILE = join(homedir(), ".outlast", "config.json");
export const DEFAULT_ENDPOINT = "http://localhost:3000";
