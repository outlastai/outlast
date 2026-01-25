/**
 * Copyright (C) 2026 by Outlast. MIT License.
 *
 * Unit tests for Contacts API functions.
 */
import { expect } from "chai";
import { describe, it, beforeEach } from "mocha";
import {
  createCreateContact,
  createDeleteContact,
  createListContacts
} from "../../src/api/contacts/index.js";
import { createMockDbClient, type MockDbClient } from "../integration/setup.js";

describe("Contacts API Functions", () => {
  let mockDb: MockDbClient;
  const workspaceId = "test-workspace";

  beforeEach(() => {
    mockDb = createMockDbClient();
  });

  describe("createCreateContact", () => {
    it("should create a contact with required fields", async () => {
      const createContact = createCreateContact(mockDb, workspaceId);
      const result = await createContact({
        name: "John Doe",
        preferredChannel: "EMAIL"
      });

      expect(result).to.have.property("id");
      expect(result.name).to.equal("John Doe");
      expect(result.workspaceId).to.equal(workspaceId);
      expect(result.preferredChannel).to.equal("EMAIL");
      expect(result.email).to.be.null;
      expect(result.phone).to.be.null;
    });

    it("should create a contact with all fields", async () => {
      const createContact = createCreateContact(mockDb, workspaceId);
      const result = await createContact({
        name: "Jane Smith",
        email: "jane@example.com",
        phone: "+1234567890",
        preferredChannel: "PHONE"
      });

      expect(result.name).to.equal("Jane Smith");
      expect(result.email).to.equal("jane@example.com");
      expect(result.phone).to.equal("+1234567890");
      expect(result.preferredChannel).to.equal("PHONE");
    });

    it("should reject empty name", async () => {
      const createContact = createCreateContact(mockDb, workspaceId);

      try {
        await createContact({ name: "", preferredChannel: "EMAIL" });
        expect.fail("Expected validation error");
      } catch (error) {
        expect(error).to.have.property("name", "ValidationError");
      }
    });

    it("should reject invalid email", async () => {
      const createContact = createCreateContact(mockDb, workspaceId);

      try {
        await createContact({
          name: "Test",
          email: "invalid-email",
          preferredChannel: "EMAIL"
        });
        expect.fail("Expected validation error");
      } catch (error) {
        expect(error).to.have.property("name", "ValidationError");
      }
    });

    it("should reject invalid channel", async () => {
      const createContact = createCreateContact(mockDb, workspaceId);

      try {
        await createContact({
          name: "Test",
          preferredChannel: "INVALID" as "EMAIL"
        });
        expect.fail("Expected validation error");
      } catch (error) {
        expect(error).to.have.property("name", "ValidationError");
      }
    });
  });

  describe("createDeleteContact", () => {
    it("should delete a contact by ID", async () => {
      const createContact = createCreateContact(mockDb, workspaceId);
      const created = await createContact({
        name: "To Delete",
        preferredChannel: "SMS"
      });

      const deleteContact = createDeleteContact(mockDb);
      const result = await deleteContact({ id: created.id });

      expect(result.id).to.equal(created.id);

      // Verify it's actually deleted
      const found = await mockDb.contact.findUnique({ where: { id: created.id } });
      expect(found).to.be.null;
    });

    it("should reject invalid UUID", async () => {
      const deleteContact = createDeleteContact(mockDb);

      try {
        await deleteContact({ id: "invalid-uuid" });
        expect.fail("Expected validation error");
      } catch (error) {
        expect(error).to.have.property("name", "ValidationError");
      }
    });
  });

  describe("createListContacts", () => {
    beforeEach(async () => {
      const createContact = createCreateContact(mockDb, workspaceId);
      await createContact({ name: "Contact 1", preferredChannel: "EMAIL" });
      await createContact({ name: "Contact 2", preferredChannel: "PHONE" });
      await createContact({ name: "Contact 3", preferredChannel: "WHATSAPP" });
    });

    it("should list all contacts", async () => {
      const listContacts = createListContacts(mockDb);
      const result = await listContacts({});

      expect(result).to.have.length(3);
    });

    it("should support pagination", async () => {
      const listContacts = createListContacts(mockDb);
      const result = await listContacts({ skip: 1, take: 1 });

      expect(result).to.have.length(1);
    });

    it("should respect take limit", async () => {
      const listContacts = createListContacts(mockDb);
      const result = await listContacts({ take: 2 });

      expect(result).to.have.length(2);
    });
  });
});
