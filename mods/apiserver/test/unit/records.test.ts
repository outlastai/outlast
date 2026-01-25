/**
 * Copyright (C) 2026 by Outlast. MIT License.
 *
 * Unit tests for Records API functions.
 */
import { expect } from "chai";
import { describe, it, beforeEach } from "mocha";
import {
  createCreateRecord,
  createUpdateRecord,
  createDeleteRecord,
  createListRecords,
  createGetRecordHistory
} from "../../src/api/records/index.js";
import {
  createMockDbClient,
  createMockRecordHistory,
  type MockDbClient
} from "../integration/setup.js";

describe("Records API Functions", () => {
  let mockDb: MockDbClient;
  const workspaceId = "test-workspace";

  beforeEach(() => {
    mockDb = createMockDbClient();
  });

  describe("createCreateRecord", () => {
    it("should create a record with valid input", async () => {
      const createRecord = createCreateRecord(mockDb, workspaceId);
      const result = await createRecord({ title: "Test Record" });

      expect(result).to.have.property("id");
      expect(result.title).to.equal("Test Record");
      expect(result.workspaceId).to.equal(workspaceId);
      expect(result.status).to.equal("OPEN");
      expect(result.type).to.equal("GENERIC");
      expect(result.sourceSystem).to.equal("MANUAL");
    });

    it("should create a record with optional fields", async () => {
      const createRecord = createCreateRecord(mockDb, workspaceId);
      const result = await createRecord({
        title: "Test Record",
        status: "BLOCKED",
        type: "INVOICE",
        priority: "HIGH"
      });

      expect(result.status).to.equal("BLOCKED");
      expect(result.type).to.equal("INVOICE");
      expect(result.priority).to.equal("HIGH");
    });

    it("should reject empty title", async () => {
      const createRecord = createCreateRecord(mockDb, workspaceId);

      try {
        await createRecord({ title: "" });
        expect.fail("Expected validation error");
      } catch (error) {
        expect(error).to.have.property("name", "ValidationError");
      }
    });
  });

  describe("createUpdateRecord", () => {
    it("should update a record by ID", async () => {
      // First create a record
      const createRecord = createCreateRecord(mockDb, workspaceId);
      const created = await createRecord({ title: "Original Title" });

      const updateRecord = createUpdateRecord(mockDb);
      const result = await updateRecord({
        id: created.id,
        title: "Updated Title",
        status: "DONE"
      });

      expect(result.id).to.equal(created.id);
      expect(result.title).to.equal("Updated Title");
      expect(result.status).to.equal("DONE");
    });

    it("should reject invalid UUID", async () => {
      const updateRecord = createUpdateRecord(mockDb);

      try {
        await updateRecord({ id: "invalid-uuid", title: "Test" });
        expect.fail("Expected validation error");
      } catch (error) {
        expect(error).to.have.property("name", "ValidationError");
      }
    });
  });

  describe("createDeleteRecord", () => {
    it("should delete a record by ID", async () => {
      const createRecord = createCreateRecord(mockDb, workspaceId);
      const created = await createRecord({ title: "To Delete" });

      const deleteRecord = createDeleteRecord(mockDb);
      const result = await deleteRecord({ id: created.id });

      expect(result.id).to.equal(created.id);

      // Verify it's actually deleted
      const found = await mockDb.record.findUnique({ where: { id: created.id } });
      expect(found).to.be.null;
    });

    it("should reject invalid UUID", async () => {
      const deleteRecord = createDeleteRecord(mockDb);

      try {
        await deleteRecord({ id: "invalid-uuid" });
        expect.fail("Expected validation error");
      } catch (error) {
        expect(error).to.have.property("name", "ValidationError");
      }
    });
  });

  describe("createListRecords", () => {
    beforeEach(async () => {
      const createRecord = createCreateRecord(mockDb, workspaceId);
      await createRecord({ title: "Record 1", status: "OPEN" });
      await createRecord({ title: "Record 2", status: "DONE" });
      await createRecord({ title: "Record 3", status: "OPEN", type: "INVOICE" });
    });

    it("should list all records", async () => {
      const listRecords = createListRecords(mockDb);
      const result = await listRecords({});

      expect(result).to.have.length(3);
    });

    it("should support pagination", async () => {
      const listRecords = createListRecords(mockDb);
      const result = await listRecords({ skip: 1, take: 1 });

      expect(result).to.have.length(1);
    });

    it("should filter by status", async () => {
      const listRecords = createListRecords(mockDb);
      const result = await listRecords({ status: "OPEN" });

      expect(result).to.have.length(2);
      result.forEach((r) => expect(r.status).to.equal("OPEN"));
    });

    it("should filter by type", async () => {
      const listRecords = createListRecords(mockDb);
      const result = await listRecords({ type: "INVOICE" });

      expect(result).to.have.length(1);
      expect(result[0].type).to.equal("INVOICE");
    });
  });

  describe("createGetRecordHistory", () => {
    it("should get history for a record", async () => {
      const createRecord = createCreateRecord(mockDb, workspaceId);
      const created = await createRecord({ title: "Test Record" });

      // Add some mock history
      mockDb._addRecordHistory(created.id, createMockRecordHistory(created.id, { status: "OPEN" }));
      mockDb._addRecordHistory(created.id, createMockRecordHistory(created.id, { status: "DONE" }));

      const getHistory = createGetRecordHistory(mockDb);
      const result = await getHistory({ recordId: created.id });

      expect(result).to.have.length(2);
    });

    it("should return empty array for record with no history", async () => {
      const createRecord = createCreateRecord(mockDb, workspaceId);
      const created = await createRecord({ title: "Test Record" });

      const getHistory = createGetRecordHistory(mockDb);
      const result = await getHistory({ recordId: created.id });

      expect(result).to.have.length(0);
    });

    it("should support pagination for history", async () => {
      const createRecord = createCreateRecord(mockDb, workspaceId);
      const created = await createRecord({ title: "Test Record" });

      // Add multiple history entries
      for (let i = 0; i < 5; i++) {
        mockDb._addRecordHistory(
          created.id,
          createMockRecordHistory(created.id, { humanNote: `Note ${i}` })
        );
      }

      const getHistory = createGetRecordHistory(mockDb);
      const result = await getHistory({ recordId: created.id, skip: 1, take: 2 });

      expect(result).to.have.length(2);
    });
  });
});
