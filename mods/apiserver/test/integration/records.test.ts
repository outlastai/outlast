/**
 * Copyright (C) 2026 by Outlast. MIT License.
 */
import { expect } from "chai";
import { TRPCError } from "@trpc/server";
import { createAuthenticatedCaller, createUnauthenticatedCaller } from "./setup.js";

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
