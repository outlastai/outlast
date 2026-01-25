/**
 * Copyright (C) 2026 by Outlast. MIT License.
 */

/**
 * Record entity type matching the Prisma model.
 */
export interface Record {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Record create input type.
 */
export interface RecordCreateInput {
  title: string;
}

/**
 * Database client interface for dependency injection.
 * This interface abstracts the Prisma client for testing and flexibility.
 */
export interface DbClient {
  record: {
    create: (args: { data: RecordCreateInput }) => Promise<Record>;
    findMany: (args?: { skip?: number; take?: number }) => Promise<Record[]>;
    findUnique: (args: { where: { id: string } }) => Promise<Record | null>;
    update: (args: { where: { id: string }; data: Partial<RecordCreateInput> }) => Promise<Record>;
    delete: (args: { where: { id: string } }) => Promise<Record>;
  };
}
