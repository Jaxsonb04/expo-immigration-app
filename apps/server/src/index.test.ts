import { describe, expect, test } from "bun:test";

import { createApp } from "./index";

async function readJson(response: Response): Promise<unknown> {
  return response.json();
}

describe("server API boundary", () => {
  test("keeps health public", async () => {
    const app = createApp({ protectedApiToken: "phase6-test-token" });

    const response = await app.request("/health");

    expect(response.status).toBe(200);
    expect(await readJson(response)).toEqual({
      success: true,
      data: { status: "ok" },
    });
  });

  test("fails closed when protected API auth is not configured", async () => {
    const app = createApp();

    const response = await app.request("/v1/loop/contract", {
      headers: { Authorization: "Bearer phase6-test-token" },
    });

    expect(response.status).toBe(503);
    expect(await readJson(response)).toEqual({
      success: false,
      error: "auth_not_configured",
    });
  });

  test("rejects missing and invalid bearer tokens before returning loop contracts", async () => {
    const app = createApp({ protectedApiToken: "phase6-test-token" });

    const missing = await app.request("/v1/loop/contract");
    const invalid = await app.request("/v1/loop/contract", {
      headers: { Authorization: "Bearer wrong-token" },
    });

    expect(missing.status).toBe(401);
    expect(await readJson(missing)).toEqual({
      success: false,
      error: "authorization_required",
    });
    expect(invalid.status).toBe(401);
    expect(await readJson(invalid)).toEqual({
      success: false,
      error: "authorization_required",
    });
  });

  test("returns only a non-PII loop contract for an authenticated caller", async () => {
    const app = createApp({ protectedApiToken: "phase6-test-token" });

    const response = await app.request("/v1/loop/contract", {
      headers: { Authorization: "Bearer phase6-test-token" },
    });

    expect(response.status).toBe(200);
    expect(await readJson(response)).toEqual({
      success: true,
      data: {
        version: "phase6-local-loop-v1",
        authScope: "authenticated_user",
        piiMode: "none",
        storageMode: "local_only",
        features: [
          {
            key: "filing",
            label: "I-765 filing wizard",
            productionGate: "Counsel-reviewed form logic, PDF generation, and PII encryption",
          },
          {
            key: "tracker",
            label: "Manual case tracker",
            productionGate: "Authenticated user-scoped case records before any USCIS integration",
          },
          {
            key: "calendar",
            label: "Calendar reminders",
            productionGate: "Railway cron, Expo push tokens, and push receipt pruning",
          },
          {
            key: "forum",
            label: "Forum safety shell",
            productionGate: "Moderation queue, reporting workflow, and pseudonymous auth identity",
          },
          {
            key: "news",
            label: "News source shell",
            productionGate: "Editorial queue before any official-source ingestion or publish action",
          },
        ],
      },
    });
  });
});
