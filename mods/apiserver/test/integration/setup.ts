/**
 * Copyright (C) 2026 by Outlast. MIT License.
 *
 * Test setup utilities for integration tests.
 * Provides helpers for creating tRPC callers and managing test state.
 */
import { appRouter } from "../../src/trpc/index.js";
import type { Context } from "../../src/trpc/context.js";
import type {
  RecordEntity,
  Contact,
  Workflow,
  RecordHistory,
  RecordCreateInput,
  RecordUpdateInput,
  ContactCreateInput,
  WorkflowCreateInput,
  WorkflowUpdateInput,
  RecordStatusValue,
  RecordTypeValue
} from "@outlast/common";

const TEST_WORKSPACE_ID = "test-workspace-id";

/**
 * Creates a mock database client for testing.
 * In a real setup, you might use an in-memory database or test containers.
 */
export function createMockDbClient() {
  const records: Map<string, RecordEntity> = new Map();
  const contacts: Map<string, Contact> = new Map();
  const workflows: Map<string, Workflow> = new Map();
  const recordHistoryStore: Map<string, RecordHistory[]> = new Map();

  return {
    record: {
      create: async (args: { data: RecordCreateInput }): Promise<RecordEntity> => {
        const id = crypto.randomUUID();
        const now = new Date();
        const record: RecordEntity = {
          id,
          workspaceId: args.data.workspaceId,
          type: args.data.type ?? "GENERIC",
          title: args.data.title,
          status: args.data.status ?? "OPEN",
          risk: args.data.risk ?? null,
          priority: args.data.priority ?? null,
          contactId: args.data.contactId ?? null,
          dueAt: args.data.dueAt ?? null,
          createdAt: now,
          updatedAt: now,
          sourceSystem: args.data.sourceSystem ?? "MANUAL",
          sourceRecordId: args.data.sourceRecordId ?? null,
          metadata: args.data.metadata ?? null,
          rawData: args.data.rawData ?? null
        };
        records.set(id, record);
        // Initialize empty history for this record
        recordHistoryStore.set(id, []);
        return record;
      },
      findMany: async (args?: {
        skip?: number;
        take?: number;
        where?: { workspaceId?: string; status?: RecordStatusValue; type?: RecordTypeValue };
      }): Promise<RecordEntity[]> => {
        let allRecords = Array.from(records.values());
        // Apply filters
        if (args?.where?.status) {
          allRecords = allRecords.filter((r) => r.status === args.where!.status);
        }
        if (args?.where?.type) {
          allRecords = allRecords.filter((r) => r.type === args.where!.type);
        }
        if (args?.where?.workspaceId) {
          allRecords = allRecords.filter((r) => r.workspaceId === args.where!.workspaceId);
        }
        const skip = args?.skip || 0;
        const take = args?.take || allRecords.length;
        return allRecords.slice(skip, skip + take);
      },
      findUnique: async (args: { where: { id: string } }): Promise<RecordEntity | null> => {
        return records.get(args.where.id) || null;
      },
      update: async (args: {
        where: { id: string };
        data: RecordUpdateInput;
      }): Promise<RecordEntity> => {
        const record = records.get(args.where.id);
        if (!record) throw new Error("Record not found");
        const updated: RecordEntity = { ...record, ...args.data, updatedAt: new Date() };
        records.set(args.where.id, updated);
        return updated;
      },
      delete: async (args: { where: { id: string } }): Promise<RecordEntity> => {
        const record = records.get(args.where.id);
        if (!record) throw new Error("Record not found");
        records.delete(args.where.id);
        recordHistoryStore.delete(args.where.id);
        return record;
      }
    },

    contact: {
      create: async (args: { data: ContactCreateInput }): Promise<Contact> => {
        const id = crypto.randomUUID();
        const now = new Date();
        const contact: Contact = {
          id,
          workspaceId: args.data.workspaceId,
          name: args.data.name,
          email: args.data.email ?? null,
          phone: args.data.phone ?? null,
          preferredChannel: args.data.preferredChannel,
          createdAt: now,
          updatedAt: now
        };
        contacts.set(id, contact);
        return contact;
      },
      findMany: async (args?: {
        skip?: number;
        take?: number;
        where?: { workspaceId?: string };
      }): Promise<Contact[]> => {
        let allContacts = Array.from(contacts.values());
        if (args?.where?.workspaceId) {
          allContacts = allContacts.filter((c) => c.workspaceId === args.where!.workspaceId);
        }
        const skip = args?.skip || 0;
        const take = args?.take || allContacts.length;
        return allContacts.slice(skip, skip + take);
      },
      findUnique: async (args: { where: { id: string } }): Promise<Contact | null> => {
        return contacts.get(args.where.id) || null;
      },
      delete: async (args: { where: { id: string } }): Promise<Contact> => {
        const contact = contacts.get(args.where.id);
        if (!contact) throw new Error("Contact not found");
        contacts.delete(args.where.id);
        return contact;
      }
    },

    workflow: {
      create: async (args: { data: WorkflowCreateInput }): Promise<Workflow> => {
        const id = crypto.randomUUID();
        const now = new Date();
        const workflow: Workflow = {
          id,
          workspaceId: args.data.workspaceId,
          name: args.data.name,
          description: args.data.description ?? null,
          model: args.data.model ?? null,
          systemPrompt: args.data.systemPrompt ?? null,
          temperature: args.data.temperature ?? null,
          tools: args.data.tools ?? null,
          staticRules: args.data.staticRules ?? null,
          schedule: args.data.schedule ?? null,
          createdAt: now,
          updatedAt: now
        };
        workflows.set(id, workflow);
        return workflow;
      },
      findMany: async (args?: {
        skip?: number;
        take?: number;
        where?: { workspaceId?: string };
      }): Promise<Workflow[]> => {
        let allWorkflows = Array.from(workflows.values());
        if (args?.where?.workspaceId) {
          allWorkflows = allWorkflows.filter((w) => w.workspaceId === args.where!.workspaceId);
        }
        const skip = args?.skip || 0;
        const take = args?.take || allWorkflows.length;
        return allWorkflows.slice(skip, skip + take);
      },
      findUnique: async (args: { where: { id: string } }): Promise<Workflow | null> => {
        return workflows.get(args.where.id) || null;
      },
      update: async (args: {
        where: { id: string };
        data: WorkflowUpdateInput;
      }): Promise<Workflow> => {
        const workflow = workflows.get(args.where.id);
        if (!workflow) throw new Error("Workflow not found");
        const updated: Workflow = { ...workflow, ...args.data, updatedAt: new Date() };
        workflows.set(args.where.id, updated);
        return updated;
      },
      delete: async (args: { where: { id: string } }): Promise<Workflow> => {
        const workflow = workflows.get(args.where.id);
        if (!workflow) throw new Error("Workflow not found");
        workflows.delete(args.where.id);
        return workflow;
      }
    },

    recordHistory: {
      findMany: async (args?: {
        skip?: number;
        take?: number;
        where?: { recordId?: string };
        orderBy?: { createdAt: "asc" | "desc" };
      }): Promise<RecordHistory[]> => {
        if (!args?.where?.recordId) {
          return [];
        }
        let history = recordHistoryStore.get(args.where.recordId) || [];
        if (args?.orderBy?.createdAt === "desc") {
          history = [...history].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        } else if (args?.orderBy?.createdAt === "asc") {
          history = [...history].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        }
        const skip = args?.skip || 0;
        const take = args?.take || history.length;
        return history.slice(skip, skip + take);
      }
    },

    // Helper to clear all data between tests
    _clearAll: () => {
      records.clear();
      contacts.clear();
      workflows.clear();
      recordHistoryStore.clear();
    },

    // Helper to add record history for testing
    _addRecordHistory: (recordId: string, history: RecordHistory) => {
      const existing = recordHistoryStore.get(recordId) || [];
      existing.push(history);
      recordHistoryStore.set(recordId, existing);
    }
  };
}

export type MockDbClient = ReturnType<typeof createMockDbClient>;

/**
 * Creates an authenticated tRPC caller for testing protected procedures.
 *
 * @returns A tRPC caller with isAuthenticated: true and accessKeyId set
 */
export function createAuthenticatedCaller() {
  const mockDb = createMockDbClient();
  const ctx: Context = {
    db: mockDb,
    isAuthenticated: true,
    accessKeyId: TEST_WORKSPACE_ID
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

/**
 * Creates a mock RecordHistory entry for testing.
 */
export function createMockRecordHistory(
  recordId: string,
  overrides: Partial<RecordHistory> = {}
): RecordHistory {
  return {
    id: crypto.randomUUID(),
    recordId,
    status: "OPEN",
    aiNote: null,
    humanNote: null,
    agent: "test-agent",
    channel: "EMAIL",
    channelMetadata: null,
    createdAt: new Date(),
    ...overrides
  };
}
