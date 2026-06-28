import { expo } from "@better-auth/expo";
import { betterAuth, type Auth, type BetterAuthOptions } from "better-auth";
import type { Pool } from "pg";

import type { SessionUser } from "./profile-store";

export interface AuthService {
  getSessionUser(request: Request): Promise<SessionUser | null>;
}

export interface CreateAuthOptions {
  pool: Pool;
  baseUrl?: string;
  secret?: string;
  googleClientId?: string;
  googleClientSecret?: string;
}

type ImmigrationAuth = Auth<BetterAuthOptions>;

// Better Auth's providerId for the built-in email/password credential account.
const CREDENTIAL_PROVIDER_ID = "credential";

export class BetterAuthSessionService implements AuthService {
  private readonly auth: ImmigrationAuth;

  constructor(auth: ImmigrationAuth) {
    this.auth = auth;
  }

  async getSessionUser(request: Request): Promise<SessionUser | null> {
    const session = await this.auth.api.getSession({ headers: request.headers });

    if (!session) {
      return null;
    }

    return {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      provider: await this.resolveProvider(request),
    };
  }

  // The session payload does not record which provider the user authenticated
  // with, so we look up their linked accounts for a display-only badge. This is
  // best-effort metadata — a failure here must never block an authenticated
  // request, so we fall back to "unknown".
  private async resolveProvider(request: Request): Promise<SessionUser["provider"]> {
    try {
      const accounts = await this.auth.api.listUserAccounts({ headers: request.headers });

      if (!Array.isArray(accounts)) {
        return "unknown";
      }

      if (accounts.some((account) => account.providerId === "google")) {
        return "google";
      }

      if (accounts.some((account) => account.providerId === CREDENTIAL_PROVIDER_ID)) {
        return "email";
      }
    } catch {
      return "unknown";
    }

    return "unknown";
  }
}

export function createImmigrationAuth(options: CreateAuthOptions): ImmigrationAuth | undefined {
  const authOptions = buildAuthOptions(options);

  if (!authOptions) {
    return undefined;
  }

  return betterAuth(authOptions);
}

export function buildAuthOptions(options: CreateAuthOptions): BetterAuthOptions | undefined {
  const baseURL = options.baseUrl?.trim();
  const secret = options.secret?.trim();
  const googleClientId = options.googleClientId?.trim();
  const googleClientSecret = options.googleClientSecret?.trim();

  if (!baseURL || !secret) {
    return undefined;
  }

  return {
    appName: "Immigration App",
    baseURL,
    secret,
    database: options.pool,
    // "Create your own account" path. No transactional email provider exists
    // yet, so email verification stays off until that gate lands; keep the
    // minimum length in sync with packages/shared/src/auth.ts.
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
      minPasswordLength: 8,
    },
    plugins: [expo()],
    socialProviders:
      googleClientId && googleClientSecret
        ? {
            google: {
              clientId: googleClientId,
              clientSecret: googleClientSecret,
            },
          }
        : {},
    trustedOrigins: [
      baseURL,
      "heroui-native-app://",
      "exp://localhost:8081",
      "http://localhost:8081",
      "http://127.0.0.1:8081",
    ],
    advanced: {
      trustedProxyHeaders: true,
      useSecureCookies: baseURL.startsWith("https://"),
    },
  };
}
