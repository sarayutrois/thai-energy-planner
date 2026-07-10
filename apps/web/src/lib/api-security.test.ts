import { describe, expect, it } from "vitest";
import { guardApiRequest } from "./api-security";

describe("API security guard", () => {
  it("rejects an untrusted origin", () => {
    const response = guardApiRequest(
      new Request("https://planner.example/api/test", {
        headers: { origin: "https://attacker.example" },
      }),
      { bucket: "origin-test", limit: 2, windowMs: 60_000 },
    );

    expect(response?.status).toBe(403);
  });

  it("limits a client after the configured request count", () => {
    const options = {
      bucket: `limit-test-${Date.now()}`,
      limit: 1,
      windowMs: 60_000,
    };
    const request = new Request("https://planner.example/api/test", {
      headers: { "x-forwarded-for": "203.0.113.25" },
    });

    expect(guardApiRequest(request, options)).toBeNull();
    expect(guardApiRequest(request, options)?.status).toBe(429);
  });
});
