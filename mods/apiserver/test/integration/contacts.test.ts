/**
 * Copyright (C) 2026 by Outlast.
 */
import { expect } from "chai";
import { TRPCError } from "@trpc/server";
import { createAuthenticatedCaller, createUnauthenticatedCaller } from "./setup.js";

describe("Contacts API", () => {
  describe("createContact", () => {
    describe("when authenticated", () => {
      it("should create a contact with required fields", async () => {
        const { caller } = createAuthenticatedCaller();

        const result = await caller.createContact({
          name: "John Doe",
          preferredChannel: "EMAIL"
        });

        expect(result).to.have.property("id");
        expect(result.name).to.equal("John Doe");
        expect(result.preferredChannel).to.equal("EMAIL");
        expect(result).to.have.property("createdAt");
        expect(result).to.have.property("updatedAt");
      });

      it("should create a contact with all fields", async () => {
        const { caller } = createAuthenticatedCaller();

        const result = await caller.createContact({
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
        const { caller } = createAuthenticatedCaller();

        try {
          await caller.createContact({ name: "", preferredChannel: "EMAIL" });
          expect.fail("Expected validation error");
        } catch (error) {
          expect(error).to.be.instanceOf(TRPCError);
        }
      });

      it("should reject invalid email", async () => {
        const { caller } = createAuthenticatedCaller();

        try {
          await caller.createContact({
            name: "Test",
            email: "invalid-email",
            preferredChannel: "EMAIL"
          });
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
          await caller.createContact({
            name: "Test",
            preferredChannel: "EMAIL"
          });
          expect.fail("Expected UNAUTHORIZED error");
        } catch (error) {
          expect(error).to.be.instanceOf(TRPCError);
          expect((error as TRPCError).code).to.equal("UNAUTHORIZED");
        }
      });
    });
  });

  describe("deleteContact", () => {
    it("should delete a contact when authenticated", async () => {
      const { caller, db } = createAuthenticatedCaller();
      const created = await caller.createContact({
        name: "To Delete",
        preferredChannel: "SMS"
      });

      const result = await caller.deleteContact({ id: created.id });

      expect(result.id).to.equal(created.id);

      // Verify deleted
      const found = await db.contact.findUnique({ where: { id: created.id } });
      expect(found).to.be.null;
    });

    it("should reject when not authenticated", async () => {
      const { caller: authCaller } = createAuthenticatedCaller();
      const created = await authCaller.createContact({
        name: "Test",
        preferredChannel: "EMAIL"
      });

      const { caller: unauthCaller } = createUnauthenticatedCaller();
      try {
        await unauthCaller.deleteContact({ id: created.id });
        expect.fail("Expected UNAUTHORIZED error");
      } catch (error) {
        expect((error as TRPCError).code).to.equal("UNAUTHORIZED");
      }
    });
  });

  describe("listContacts", () => {
    it("should list contacts when authenticated", async () => {
      const { caller } = createAuthenticatedCaller();
      await caller.createContact({ name: "Contact 1", preferredChannel: "EMAIL" });
      await caller.createContact({ name: "Contact 2", preferredChannel: "PHONE" });

      const result = await caller.listContacts({});

      expect(result).to.have.length(2);
    });

    it("should support pagination", async () => {
      const { caller } = createAuthenticatedCaller();
      await caller.createContact({ name: "Contact 1", preferredChannel: "EMAIL" });
      await caller.createContact({ name: "Contact 2", preferredChannel: "PHONE" });
      await caller.createContact({ name: "Contact 3", preferredChannel: "SMS" });

      const result = await caller.listContacts({ skip: 1, take: 1 });

      expect(result).to.have.length(1);
    });

    it("should reject when not authenticated", async () => {
      const { caller } = createUnauthenticatedCaller();

      try {
        await caller.listContacts({});
        expect.fail("Expected UNAUTHORIZED error");
      } catch (error) {
        expect((error as TRPCError).code).to.equal("UNAUTHORIZED");
      }
    });
  });
});
