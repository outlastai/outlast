/**
 * Copyright (C) 2026 by Outlast. MIT License.
 */
import { expect } from "chai";
import { TRPCError } from "@trpc/server";
import {
  createAuthenticatedCaller,
  createUnauthenticatedCaller,
  createMockRecordHistory
} from "./setup.js";

describe("Records API", () => {
  describe("createRecord", () => {
    describe("when authenticated", () => {
      it("should create a record with valid input", async () => {
        const { caller } = createAuthenticatedCaller();

        const result = await caller.createRecord({ title: "Test Record" });

        expect(result).to.have.property("id");
        expect(result.title).to.equal("Test Record");
        expect(result).to.have.property("createdAt");
        expect(result).to.have.property("updatedAt");
        expect(result.status).to.equal("OPEN");
        expect(result.type).to.equal("GENERIC");
      });

      it("should create a record with optional fields", async () => {
        const { caller } = createAuthenticatedCaller();

        const result = await caller.createRecord({
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
        const { caller } = createAuthenticatedCaller();

        try {
          await caller.createRecord({ title: "" });
          expect.fail("Expected validation error");
        } catch (error) {
          expect(error).to.be.instanceOf(TRPCError);
        }
      });
    });

    describe("when not authenticated", () => {
      it("should reject the request", async () => {
        const { caller } = createUnauthenticatedCaller();

        try {
          await caller.createRecord({ title: "Test Record" });
          expect.fail("Expected UNAUTHORIZED error");
        } catch (error) {
          expect(error).to.be.instanceOf(TRPCError);
          expect((error as TRPCError).code).to.equal("UNAUTHORIZED");
        }
      });
    });
  });

  describe("updateRecord", () => {
    it("should update a record when authenticated", async () => {
      const { caller } = createAuthenticatedCaller();
      const created = await caller.createRecord({ title: "Original" });

      const result = await caller.updateRecord({
        id: created.id,
        title: "Updated",
        status: "DONE"
      });

      expect(result.id).to.equal(created.id);
      expect(result.title).to.equal("Updated");
      expect(result.status).to.equal("DONE");
    });

    it("should reject when not authenticated", async () => {
      const { caller: authCaller } = createAuthenticatedCaller();
      const created = await authCaller.createRecord({ title: "Test" });

      const { caller: unauthCaller } = createUnauthenticatedCaller();
      try {
        await unauthCaller.updateRecord({ id: created.id, title: "Updated" });
        expect.fail("Expected UNAUTHORIZED error");
      } catch (error) {
        expect((error as TRPCError).code).to.equal("UNAUTHORIZED");
      }
    });
  });

  describe("deleteRecord", () => {
    it("should delete a record when authenticated", async () => {
      const { caller, db } = createAuthenticatedCaller();
      const created = await caller.createRecord({ title: "To Delete" });

      const result = await caller.deleteRecord({ id: created.id });

      expect(result.id).to.equal(created.id);

      // Verify deleted
      const found = await db.record.findUnique({ where: { id: created.id } });
      expect(found).to.be.null;
    });

    it("should reject when not authenticated", async () => {
      const { caller: authCaller } = createAuthenticatedCaller();
      const created = await authCaller.createRecord({ title: "Test" });

      const { caller: unauthCaller } = createUnauthenticatedCaller();
      try {
        await unauthCaller.deleteRecord({ id: created.id });
        expect.fail("Expected UNAUTHORIZED error");
      } catch (error) {
        expect((error as TRPCError).code).to.equal("UNAUTHORIZED");
      }
    });
  });

  describe("listRecords", () => {
    it("should list records when authenticated", async () => {
      const { caller } = createAuthenticatedCaller();
      await caller.createRecord({ title: "Record 1" });
      await caller.createRecord({ title: "Record 2" });

      const result = await caller.listRecords({});

      expect(result).to.have.length(2);
    });

    it("should support pagination", async () => {
      const { caller } = createAuthenticatedCaller();
      await caller.createRecord({ title: "Record 1" });
      await caller.createRecord({ title: "Record 2" });
      await caller.createRecord({ title: "Record 3" });

      const result = await caller.listRecords({ skip: 1, take: 1 });

      expect(result).to.have.length(1);
    });

    it("should filter by status", async () => {
      const { caller } = createAuthenticatedCaller();
      await caller.createRecord({ title: "Open", status: "OPEN" });
      await caller.createRecord({ title: "Done", status: "DONE" });

      const result = await caller.listRecords({ status: "OPEN" });

      expect(result).to.have.length(1);
      expect(result[0].status).to.equal("OPEN");
    });

    it("should reject when not authenticated", async () => {
      const { caller } = createUnauthenticatedCaller();

      try {
        await caller.listRecords({});
        expect.fail("Expected UNAUTHORIZED error");
      } catch (error) {
        expect((error as TRPCError).code).to.equal("UNAUTHORIZED");
      }
    });
  });

  describe("getRecordHistory", () => {
    it("should get record history when authenticated", async () => {
      const { caller, db } = createAuthenticatedCaller();
      const created = await caller.createRecord({ title: "Test" });

      // Add mock history
      db._addRecordHistory(created.id, createMockRecordHistory(created.id, { status: "OPEN" }));
      db._addRecordHistory(created.id, createMockRecordHistory(created.id, { status: "DONE" }));

      const result = await caller.getRecordHistory({ recordId: created.id });

      expect(result).to.have.length(2);
    });

    it("should return empty for record with no history", async () => {
      const { caller } = createAuthenticatedCaller();
      const created = await caller.createRecord({ title: "Test" });

      const result = await caller.getRecordHistory({ recordId: created.id });

      expect(result).to.have.length(0);
    });

    it("should reject when not authenticated", async () => {
      const { caller: authCaller } = createAuthenticatedCaller();
      const created = await authCaller.createRecord({ title: "Test" });

      const { caller: unauthCaller } = createUnauthenticatedCaller();
      try {
        await unauthCaller.getRecordHistory({ recordId: created.id });
        expect.fail("Expected UNAUTHORIZED error");
      } catch (error) {
        expect((error as TRPCError).code).to.equal("UNAUTHORIZED");
      }
    });
  });

  describe("ping (public endpoint)", () => {
    it("should return pong without authentication", async () => {
      const { caller } = createUnauthenticatedCaller();

      const result = await caller.ping();

      expect(result.message).to.equal("pong");
      expect(result).to.have.property("timestamp");
    });

    it("should return pong with authentication", async () => {
      const { caller } = createAuthenticatedCaller();

      const result = await caller.ping();

      expect(result.message).to.equal("pong");
      expect(result).to.have.property("timestamp");
    });
  });
});
