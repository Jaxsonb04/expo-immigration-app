import { Hono } from "hono";
import { Pool } from "pg";

import { BetterAuthSessionService, createImmigrationAuth, type AuthService } from "./auth";
import {
  formatProfile,
  PostgresProfileStore,
  type ProfileStore,
  type ProfileUpdateInput,
} from "./profile-store";

// Minimal API bootstrap so Railway has a real service to build + run.
// Kept self-contained (no workspace imports) so the container build stays tiny —
// just the server + Hono, not the whole RN/Expo workspace. The full Hono +
// Drizzle + Better Auth API comes in the backend phase.

type ApiResponse<T> = { success: true; data: T } | { success: false; error: string };

type LoopFeatureKey = "filing" | "tracker" | "calendar" | "forum" | "news";

const ok = <T>(data: T): ApiResponse<T> => ({ success: true, data });
const fail = (error: string): ApiResponse<never> => ({ success: false, error });

interface LoopFeatureContract {
  key: LoopFeatureKey;
  label: string;
  productionGate: string;
}

interface LoopContract {
  version: "phase6-local-loop-v1";
  authScope: "authenticated_user";
  piiMode: "none";
  storageMode: "local_only";
  features: LoopFeatureContract[];
}

export interface CreateAppOptions {
  protectedApiToken?: string;
  authHandler?: (request: Request) => Promise<Response>;
  authService?: AuthService;
  googleAuthConfigured?: boolean;
  profileStore?: ProfileStore;
}

const loopContract: LoopContract = {
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
};

function hasValidBearerToken(
  authorizationHeader: string | undefined,
  protectedApiToken: string
): boolean {
  return authorizationHeader === `Bearer ${protectedApiToken}`;
}

export function createApp({
  protectedApiToken,
  authHandler,
  authService,
  googleAuthConfigured = false,
  profileStore,
}: CreateAppOptions = {}) {
  const app = new Hono();

  app.get("/", (c) => c.json(ok({ service: "immigration-api", status: "ok" })));
  app.get("/health", (c) => c.json(ok({ status: "ok" })));
  app.get("/v1/auth/status", (c) =>
    c.json(
      ok({
        provider: "google",
        googleConfigured: googleAuthConfigured,
      })
    )
  );

  if (authHandler) {
    app.all("/api/auth/*", (c) => authHandler(c.req.raw));
  }

  app.get("/v1/loop/contract", (c) => {
    const configuredToken = protectedApiToken?.trim();

    if (!configuredToken) {
      return c.json(fail("auth_not_configured"), 503);
    }

    if (!hasValidBearerToken(c.req.header("Authorization"), configuredToken)) {
      return c.json(fail("authorization_required"), 401);
    }

    return c.json(ok(loopContract));
  });

  app.get("/v1/profile", async (c) => {
    if (!authService || !profileStore) {
      return c.json(fail("auth_not_configured"), 503);
    }

    const user = await authService.getSessionUser(c.req.raw);

    if (!user) {
      return c.json(fail("authorization_required"), 401);
    }

    const profile = await profileStore.getOrCreateProfile(user);

    if (!profile) {
      return c.json(fail("profile_not_found"), 404);
    }

    return c.json(ok({ user, profile: formatProfile(profile) }));
  });

  app.patch("/v1/profile", async (c) => {
    if (!authService || !profileStore) {
      return c.json(fail("auth_not_configured"), 503);
    }

    const user = await authService.getSessionUser(c.req.raw);

    if (!user) {
      return c.json(fail("authorization_required"), 401);
    }

    const input = await readProfileUpdateInput(c.req.raw);

    if (!input.success) {
      return c.json(fail(input.error), 400);
    }

    const profile = await profileStore.updateProfile(user.id, input.data);

    if (!profile) {
      return c.json(fail("profile_not_found"), 404);
    }

    return c.json(ok({ profile: formatProfile(profile) }));
  });

  return app;
}

async function readProfileUpdateInput(
  request: Request
): Promise<{ success: true; data: ProfileUpdateInput } | { success: false; error: string }> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return { success: false, error: "invalid_json" };
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { success: false, error: "invalid_profile_payload" };
  }

  const record = body as Record<string, unknown>;
  const allowedFields = new Set(["displayName", "preferredLanguage"]);

  if (Object.keys(record).some((key) => !allowedFields.has(key))) {
    return { success: false, error: "profile_pii_not_allowed" };
  }

  const data: ProfileUpdateInput = {};

  if ("displayName" in record) {
    if (typeof record.displayName !== "string" || record.displayName.trim().length > 80) {
      return { success: false, error: "invalid_display_name" };
    }

    data.displayName = record.displayName.trim();
  }

  if ("preferredLanguage" in record) {
    if (
      record.preferredLanguage !== "en" &&
      record.preferredLanguage !== "es" &&
      record.preferredLanguage !== "other"
    ) {
      return { success: false, error: "invalid_preferred_language" };
    }

    data.preferredLanguage = record.preferredLanguage;
  }

  return { success: true, data };
}

const productionPool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL })
  : undefined;
const auth = productionPool
  ? createImmigrationAuth({
      pool: productionPool,
      baseUrl: process.env.BETTER_AUTH_URL,
      secret: process.env.BETTER_AUTH_SECRET,
      googleClientId: process.env.GOOGLE_CLIENT_ID,
      googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  : undefined;
const app = createApp({
  protectedApiToken: process.env.PHASE6_PROTECTED_API_TOKEN,
  authHandler: auth?.handler,
  authService: auth ? new BetterAuthSessionService(auth) : undefined,
  googleAuthConfigured: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
  profileStore: productionPool ? new PostgresProfileStore(productionPool) : undefined,
});

const port = Number(process.env.PORT) || 3000;

// Bun serves a default export with { port, fetch }.
export default { port, fetch: app.fetch };
