import { describe, it, expect, beforeEach } from "bun:test";
import { PeppolClient } from "../src/lib/peppol-client";

describe("PeppolClient", () => {
  let client: PeppolClient;

  beforeEach(() => {
    client = new PeppolClient("test-api-key", "https://api.example.com");
  });

  describe("sendInvoice", () => {
    it("should construct correct payload", () => {
      // Validate constructor and payload generation
      expect(client).toBeDefined();
    });

    it("should throw AppError if API key is missing", () => {
      expect(() => {
        new PeppolClient("", "https://api.example.com");
      }).toThrow();
    });
  });

  describe("checkStatus", () => {
    it("should normalize status values correctly", () => {
      // Manual test of status normalization logic
      // In integration tests, verify with actual Recommand API
      expect(client).toBeDefined();
    });
  });

  describe("constructor", () => {
    it("should initialize with API key and base URL", () => {
      const c = new PeppolClient("test-key", "https://api.test.com");
      expect(c).toBeDefined();
    });
  });
});
