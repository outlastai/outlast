/**
 * Copyright (C) 2026 by Outlast.
 *
 * Unit tests for Workflows API functions.
 */
import { expect } from "chai";
import { describe, it, beforeEach } from "mocha";
import {
  createCreateWorkflow,
  createUpdateWorkflow,
  createDeleteWorkflow,
  createListWorkflows
} from "../../src/api/workflows/index.js";
import { createMockDbClient, type MockDbClient } from "../integration/setup.js";

describe("Workflows API Functions", () => {
  let mockDb: MockDbClient;
  const workspaceId = "test-workspace";

  beforeEach(() => {
    mockDb = createMockDbClient();
  });

  describe("createCreateWorkflow", () => {
    it("should create a workflow with required fields", async () => {
      const createWorkflow = createCreateWorkflow(mockDb, workspaceId);
      const result = await createWorkflow({
        name: "Test Workflow"
      });

      expect(result).to.have.property("id");
      expect(result.name).to.equal("Test Workflow");
      expect(result.workspaceId).to.equal(workspaceId);
      expect(result.description).to.be.null;
      expect(result.model).to.be.null;
    });

    it("should create a workflow with all fields", async () => {
      const createWorkflow = createCreateWorkflow(mockDb, workspaceId);
      const result = await createWorkflow({
        name: "Full Workflow",
        description: "A complete workflow",
        model: "gpt-4",
        systemPrompt: "You are a helpful assistant",
        temperature: 0.7,
        tools: [{ type: "function", name: "search" }],
        schedule: "0 * * * *"
      });

      expect(result.name).to.equal("Full Workflow");
      expect(result.description).to.equal("A complete workflow");
      expect(result.model).to.equal("gpt-4");
      expect(result.systemPrompt).to.equal("You are a helpful assistant");
      expect(result.temperature).to.equal(0.7);
      expect(result.tools).to.deep.equal([{ type: "function", name: "search" }]);
      expect(result.schedule).to.equal("0 * * * *");
    });

    it("should reject empty name", async () => {
      const createWorkflow = createCreateWorkflow(mockDb, workspaceId);

      try {
        await createWorkflow({ name: "" });
        expect.fail("Expected validation error");
      } catch (error) {
        expect(error).to.have.property("name", "ValidationError");
      }
    });

    it("should reject temperature out of range", async () => {
      const createWorkflow = createCreateWorkflow(mockDb, workspaceId);

      try {
        await createWorkflow({ name: "Test", temperature: 3.0 });
        expect.fail("Expected validation error");
      } catch (error) {
        expect(error).to.have.property("name", "ValidationError");
      }
    });
  });

  describe("createUpdateWorkflow", () => {
    it("should update a workflow by ID", async () => {
      const createWorkflow = createCreateWorkflow(mockDb, workspaceId);
      const created = await createWorkflow({ name: "Original Name" });

      const updateWorkflow = createUpdateWorkflow(mockDb);
      const result = await updateWorkflow({
        id: created.id,
        name: "Updated Name",
        description: "New description"
      });

      expect(result.id).to.equal(created.id);
      expect(result.name).to.equal("Updated Name");
      expect(result.description).to.equal("New description");
    });

    it("should update only specified fields", async () => {
      const createWorkflow = createCreateWorkflow(mockDb, workspaceId);
      const created = await createWorkflow({
        name: "Original",
        description: "Original description",
        model: "gpt-3.5"
      });

      const updateWorkflow = createUpdateWorkflow(mockDb);
      const result = await updateWorkflow({
        id: created.id,
        description: "New description"
      });

      expect(result.name).to.equal("Original"); // Unchanged
      expect(result.description).to.equal("New description"); // Updated
      expect(result.model).to.equal("gpt-3.5"); // Unchanged
    });

    it("should reject invalid UUID", async () => {
      const updateWorkflow = createUpdateWorkflow(mockDb);

      try {
        await updateWorkflow({ id: "invalid-uuid", name: "Test" });
        expect.fail("Expected validation error");
      } catch (error) {
        expect(error).to.have.property("name", "ValidationError");
      }
    });
  });

  describe("createDeleteWorkflow", () => {
    it("should delete a workflow by ID", async () => {
      const createWorkflow = createCreateWorkflow(mockDb, workspaceId);
      const created = await createWorkflow({ name: "To Delete" });

      const deleteWorkflow = createDeleteWorkflow(mockDb);
      const result = await deleteWorkflow({ id: created.id });

      expect(result.id).to.equal(created.id);

      // Verify it's actually deleted
      const found = await mockDb.workflow.findUnique({ where: { id: created.id } });
      expect(found).to.be.null;
    });

    it("should reject invalid UUID", async () => {
      const deleteWorkflow = createDeleteWorkflow(mockDb);

      try {
        await deleteWorkflow({ id: "invalid-uuid" });
        expect.fail("Expected validation error");
      } catch (error) {
        expect(error).to.have.property("name", "ValidationError");
      }
    });
  });

  describe("createListWorkflows", () => {
    beforeEach(async () => {
      const createWorkflow = createCreateWorkflow(mockDb, workspaceId);
      await createWorkflow({ name: "Workflow 1" });
      await createWorkflow({ name: "Workflow 2" });
      await createWorkflow({ name: "Workflow 3" });
    });

    it("should list all workflows", async () => {
      const listWorkflows = createListWorkflows(mockDb);
      const result = await listWorkflows({});

      expect(result).to.have.length(3);
    });

    it("should support pagination", async () => {
      const listWorkflows = createListWorkflows(mockDb);
      const result = await listWorkflows({ skip: 1, take: 1 });

      expect(result).to.have.length(1);
    });

    it("should respect take limit", async () => {
      const listWorkflows = createListWorkflows(mockDb);
      const result = await listWorkflows({ take: 2 });

      expect(result).to.have.length(2);
    });
  });
});
