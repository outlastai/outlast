/**
 * Copyright (C) 2026 by Outlast. MIT License.
 */
import { createRecordSchema } from "@outlast/common";
import { router, protectedProcedure } from "../trpc.js";
import { createCreateRecord } from "../../api/records/createCreateRecord.js";

/**
 * Protected router - procedures that require Basic Auth.
 */
export const protectedRouter = router({
  /**
   * Create a new record.
   */
  createRecord: protectedProcedure.input(createRecordSchema).mutation(async ({ ctx, input }) => {
    const fn = createCreateRecord(ctx.db);
    return fn(input);
  })
});
