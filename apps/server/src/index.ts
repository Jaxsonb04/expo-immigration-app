import { Hono } from "hono";

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

function hasValidBearerToken(authorizationHeader: string | undefined, protectedApiToken: string): boolean {
  return authorizationHeader === `Bearer ${protectedApiToken}`;
}

export function createApp({ protectedApiToken }: CreateAppOptions = {}) {
  const app = new Hono();

  app.get("/", (c) => c.json(ok({ service: "immigration-api", status: "ok" })));
  app.get("/health", (c) => c.json(ok({ status: "ok" })));

  app.use("/v1/*", async (c, next) => {
    const configuredToken = protectedApiToken?.trim();

    if (!configuredToken) {
      return c.json(fail("auth_not_configured"), 503);
    }

    if (!hasValidBearerToken(c.req.header("Authorization"), configuredToken)) {
      return c.json(fail("authorization_required"), 401);
    }

    await next();
  });

  app.get("/v1/loop/contract", (c) => c.json(ok(loopContract)));

  return app;
}

const app = createApp({ protectedApiToken: process.env.PHASE6_PROTECTED_API_TOKEN });

const port = Number(process.env.PORT) || 3000;

// Bun serves a default export with { port, fetch }.
export default { port, fetch: app.fetch };
