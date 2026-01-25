/**
 * Copyright (C) 2026 by Outlast. MIT License.
 *
 * Test setup utilities for integration tests.
 * Provides helpers for creating tRPC callers and managing test state.
 */
import { appRouter } from "../../src/trpc/index.js";
import type { Context } from "../../src/trpc/context.js";

/**
 * Creates a mock database client for testing.
 * In a real setup, you might use an in-memory database or test containers.
 */
export function createMockDbClient() {
  const records: Map<string, { id: string; title: string; createdAt: Date; updatedAt: Date }> =
    new Map();

  return {
    record: {
      create: async (args: { data: { title: string } }) => {
        const id = crypto.randomUUID();
        const now = new Date();
        const record = {
          id,
          title: args.data.title,
          createdAt: now,
          updatedAt: now
        };
        records.set(id, record);
        return record;
      },
      findMany: async (args?: { skip?: number; take?: number }) => {
        const allRecords = Array.from(records.values());
        const skip = args?.skip || 0;
        const take = args?.take || allRecords.length;
        return allRecords.slice(skip, skip + take);
      },
      findUnique: async (args: { where: { id: string } }) => {
        return records.get(args.where.id) || null;
      },
      update: async (args: { where: { id: string }; data: Partial<{ title: string }> }) => {
        const record = records.get(args.where.id);
        if (!record) throw new Error("Record not found");
        const updated = { ...record, ...args.data, updatedAt: new Date() };
        records.set(args.where.id, updated);
        return updated;
      },
      delete: async (args: { where: { id: string } }) => {
        const record = records.get(args.where.id);
        if (!record) throw new Error("Record not found");
        records.delete(args.where.id);
        return record;
      }
    },
    // Helper to clear all records between tests
    _clearRecords: () => records.clear()
  };
}

/**
 * Creates an authenticated tRPC caller for testing protected procedures.
 *
 * @returns A tRPC caller with isAuthenticated: true
 */
export function createAuthenticatedCaller() {
  const mockDb = createMockDbClient();
  const ctx: Context = {
    db: mockDb,
    isAuthenticated: true
  };
  return {
    caller: appRouter.createCaller(ctx),
    db: mockDb
  };
}

/**
 * Creates an unauthenticated tRPC caller for testing auth rejection.
 *
 * @returns A tRPC caller with isAuthenticated: false
 */
export function createUnauthenticatedCaller() {
  const mockDb = createMockDbClient();
  const ctx: Context = {
    db: mockDb,
    isAuthenticated: false
  };
  return {
    caller: appRouter.createCaller(ctx),
    db: mockDb
  };
}
