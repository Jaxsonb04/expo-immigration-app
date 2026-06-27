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

  test("reports whether Google OAuth credentials are configured", async () => {
    const app = createApp({
      protectedApiToken: "phase6-test-token",
      googleAuthConfigured: true,
    });

    const response = await app.request("/v1/auth/status");

    expect(response.status).toBe(200);
    expect(await readJson(response)).toEqual({
      success: true,
      data: {
        provider: "google",
        googleConfigured: true,
      },
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
            productionGate:
              "Editorial queue before any official-source ingestion or publish action",
          },
        ],
      },
    });
  });

  test("rejects profile reads without an authenticated session", async () => {
    const app = createApp({
      protectedApiToken: "phase6-test-token",
      authService: {
        getSessionUser: async () => null,
      },
      profileStore: createFakeProfileStore(),
    });

    const response = await app.request("/v1/profile");

    expect(response.status).toBe(401);
    expect(await readJson(response)).toEqual({
      success: false,
      error: "authorization_required",
    });
  });

  test("creates and returns a database-backed profile for a Google-authenticated user", async () => {
    const app = createApp({
      protectedApiToken: "phase6-test-token",
      authService: {
        getSessionUser: async () => ({
          id: "user_google_1",
          email: "renewer@example.com",
          name: "EAD Renewer",
          provider: "google",
        }),
      },
      profileStore: createFakeProfileStore(),
    });

    const response = await app.request("/v1/profile");

    expect(response.status).toBe(200);
    expect(await readJson(response)).toEqual({
      success: true,
      data: {
        user: {
          id: "user_google_1",
          email: "renewer@example.com",
          name: "EAD Renewer",
          provider: "google",
        },
        profile: {
          displayName: "EAD Renewer",
          preferredLanguage: "en",
          hasReusableProfile: true,
          completionPercent: 20,
          piiMode: "metadata_only",
          storageMode: "database",
        },
      },
    });
  });

  test("updates only non-PII profile fields for the authenticated user", async () => {
    const profileStore = createFakeProfileStore();
    const app = createApp({
      protectedApiToken: "phase6-test-token",
      authService: {
        getSessionUser: async () => ({
          id: "user_google_2",
          email: "renewal-helper@example.com",
          name: "Renewal Helper",
          provider: "google",
        }),
      },
      profileStore,
    });

    const response = await app.request("/v1/profile", {
      body: JSON.stringify({
        displayName: "My renewal profile",
        preferredLanguage: "es",
      }),
      headers: { "Content-Type": "application/json" },
      method: "PATCH",
    });

    expect(response.status).toBe(200);
    expect(await readJson(response)).toEqual({
      success: true,
      data: {
        profile: {
          displayName: "My renewal profile",
          preferredLanguage: "es",
          hasReusableProfile: true,
          completionPercent: 20,
          piiMode: "metadata_only",
          storageMode: "database",
        },
      },
    });

    const persisted = await app.request("/v1/profile");
    expect(await readJson(persisted)).toEqual({
      success: true,
      data: {
        user: {
          id: "user_google_2",
          email: "renewal-helper@example.com",
          name: "Renewal Helper",
          provider: "google",
        },
        profile: {
          displayName: "My renewal profile",
          preferredLanguage: "es",
          hasReusableProfile: true,
          completionPercent: 20,
          piiMode: "metadata_only",
          storageMode: "database",
        },
      },
    });
  });

  test("rejects profile writes that try to introduce gated PII fields", async () => {
    const app = createApp({
      protectedApiToken: "phase6-test-token",
      authService: {
        getSessionUser: async () => ({
          id: "user_google_3",
          email: "private@example.com",
          name: "Private Profile",
          provider: "google",
        }),
      },
      profileStore: createFakeProfileStore(),
    });

    const response = await app.request("/v1/profile", {
      body: JSON.stringify({
        displayName: "Private Profile",
        aNumber: "A123456789",
      }),
      headers: { "Content-Type": "application/json" },
      method: "PATCH",
    });

    expect(response.status).toBe(400);
    expect(await readJson(response)).toEqual({
      success: false,
      error: "profile_pii_not_allowed",
    });
  });
});

function createFakeProfileStore() {
  const rows = new Map<
    string,
    {
      displayName: string;
      preferredLanguage: "en" | "es" | "other";
    }
  >();

  return {
    getOrCreateProfile: async (user: { id: string; name?: string | null }) => {
      if (!rows.has(user.id)) {
        rows.set(user.id, {
          displayName: user.name ?? "",
          preferredLanguage: "en",
        });
      }

      return rows.get(user.id);
    },
    updateProfile: async (
      userId: string,
      input: { displayName?: string; preferredLanguage?: "en" | "es" | "other" }
    ) => {
      const existing = rows.get(userId) ?? {
        displayName: "",
        preferredLanguage: "en" as const,
      };
      const next = {
        displayName: input.displayName ?? existing.displayName,
        preferredLanguage: input.preferredLanguage ?? existing.preferredLanguage,
      };
      rows.set(userId, next);
      return next;
    },
  };
}
