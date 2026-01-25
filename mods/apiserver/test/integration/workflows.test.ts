/**
 * Copyright (C) 2026 by Outlast. MIT License.
 */
import { expect } from "chai";
import { TRPCError } from "@trpc/server";
import { createAuthenticatedCaller, createUnauthenticatedCaller } from "./setup.js";

describe("Workflows API", () => {
  describe("createWorkflow", () => {
    describe("when authenticated", () => {
      it("should create a workflow with required fields", async () => {
        const { caller } = createAuthenticatedCaller();

        const result = await caller.createWorkflow({
          name: "Test Workflow"
        });

        expect(result).to.have.property("id");
        expect(result.name).to.equal("Test Workflow");
        expect(result).to.have.property("createdAt");
        expect(result).to.have.property("updatedAt");
      });

      it("should create a workflow with all fields", async () => {
        const { caller } = createAuthenticatedCaller();

        const result = await caller.createWorkflow({
          name: "Full Workflow",
          description: "A complete workflow",
          model: "gpt-4",
          systemPrompt: "You are a helpful assistant",
          temperature: 0.7,
          tools: [{ type: "function", name: "search" }],
          staticRules: { maxRetries: 3 },
          schedule: "0 * * * *"
        });

        expect(result.name).to.equal("Full Workflow");
        expect(result.description).to.equal("A complete workflow");
        expect(result.model).to.equal("gpt-4");
        expect(result.systemPrompt).to.equal("You are a helpful assistant");
        expect(result.temperature).to.equal(0.7);
      });

      it("should reject empty name", async () => {
        const { caller } = createAuthenticatedCaller();

        try {
          await caller.createWorkflow({ name: "" });
          expect.fail("Expected validation error");
        } catch (error) {
          expect(error).to.be.instanceOf(TRPCError);
        }
      });

      it("should reject temperature out of range", async () => {
        const { caller } = createAuthenticatedCaller();

        try {
          await caller.createWorkflow({ name: "Test", temperature: 3.0 });
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
          await caller.createWorkflow({ name: "Test" });
          expect.fail("Expected UNAUTHORIZED error");
        } catch (error) {
          expect(error).to.be.instanceOf(TRPCError);
          expect((error as TRPCError).code).to.equal("UNAUTHORIZED");
        }
      });
    });
  });

  describe("updateWorkflow", () => {
    it("should update a workflow when authenticated", async () => {
      const { caller } = createAuthenticatedCaller();
      const created = await caller.createWorkflow({ name: "Original" });

      const result = await caller.updateWorkflow({
        id: created.id,
        name: "Updated",
        description: "New description"
      });

      expect(result.id).to.equal(created.id);
      expect(result.name).to.equal("Updated");
      expect(result.description).to.equal("New description");
    });

    it("should update only specified fields", async () => {
      const { caller } = createAuthenticatedCaller();
      const created = await caller.createWorkflow({
        name: "Original",
        description: "Original desc",
        model: "gpt-3.5"
      });

      const result = await caller.updateWorkflow({
        id: created.id,
        description: "New description"
      });

      expect(result.name).to.equal("Original"); // Unchanged
      expect(result.description).to.equal("New description");
      expect(result.model).to.equal("gpt-3.5"); // Unchanged
    });

    it("should reject when not authenticated", async () => {
      const { caller: authCaller } = createAuthenticatedCaller();
      const created = await authCaller.createWorkflow({ name: "Test" });

      const { caller: unauthCaller } = createUnauthenticatedCaller();
      try {
        await unauthCaller.updateWorkflow({ id: created.id, name: "Updated" });
        expect.fail("Expected UNAUTHORIZED error");
      } catch (error) {
        expect((error as TRPCError).code).to.equal("UNAUTHORIZED");
      }
    });
  });

  describe("deleteWorkflow", () => {
    it("should delete a workflow when authenticated", async () => {
      const { caller, db } = createAuthenticatedCaller();
      const created = await caller.createWorkflow({ name: "To Delete" });

      const result = await caller.deleteWorkflow({ id: created.id });

      expect(result.id).to.equal(created.id);

      // Verify deleted
      const found = await db.workflow.findUnique({ where: { id: created.id } });
      expect(found).to.be.null;
    });

    it("should reject when not authenticated", async () => {
      const { caller: authCaller } = createAuthenticatedCaller();
      const created = await authCaller.createWorkflow({ name: "Test" });

      const { caller: unauthCaller } = createUnauthenticatedCaller();
      try {
        await unauthCaller.deleteWorkflow({ id: created.id });
        expect.fail("Expected UNAUTHORIZED error");
      } catch (error) {
        expect((error as TRPCError).code).to.equal("UNAUTHORIZED");
      }
    });
  });

  describe("listWorkflows", () => {
    it("should list workflows when authenticated", async () => {
      const { caller } = createAuthenticatedCaller();
      await caller.createWorkflow({ name: "Workflow 1" });
      await caller.createWorkflow({ name: "Workflow 2" });

      const result = await caller.listWorkflows({});

      expect(result).to.have.length(2);
    });

    it("should support pagination", async () => {
      const { caller } = createAuthenticatedCaller();
      await caller.createWorkflow({ name: "Workflow 1" });
      await caller.createWorkflow({ name: "Workflow 2" });
      await caller.createWorkflow({ name: "Workflow 3" });

      const result = await caller.listWorkflows({ skip: 1, take: 1 });

      expect(result).to.have.length(1);
    });

    it("should reject when not authenticated", async () => {
      const { caller } = createUnauthenticatedCaller();

      try {
        await caller.listWorkflows({});
        expect.fail("Expected UNAUTHORIZED error");
      } catch (error) {
        expect((error as TRPCError).code).to.equal("UNAUTHORIZED");
      }
    });
  });
});
