/**
 * Copyright (C) 2026 by Outlast.
 *
 * PostgreSQL checkpointer for LangGraph (dedicated schema).
 */
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";

const DEFAULT_SCHEMA = "langgraph";

export interface CreateCheckpointerOptions {
  schema?: string;
}

/**
 * Create a PostgresSaver checkpointer using a connection string.
 * Call .setup() once before first use to create the langgraph schema and tables.
 */
export function createCheckpointer(
  connectionString: string,
  options: CreateCheckpointerOptions = {}
): PostgresSaver {
  const schema = options.schema ?? DEFAULT_SCHEMA;
  return PostgresSaver.fromConnString(connectionString, { schema });
}

/**
 * Ensure checkpointer tables exist (idempotent).
 */
export async function setupCheckpointer(
  connectionString: string,
  options: CreateCheckpointerOptions = {}
): Promise<PostgresSaver> {
  const checkpointer = createCheckpointer(connectionString, options);
  await checkpointer.setup();
  return checkpointer;
}
