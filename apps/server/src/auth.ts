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
      provider: "google",
    };
  }
}

export function createImmigrationAuth(options: CreateAuthOptions): ImmigrationAuth | undefined {
  const authOptions = buildAuthOptions(options);

  if (!authOptions) {
    return undefined;
  }

  return betterAuth(authOptions);
}

function buildAuthOptions(options: CreateAuthOptions): BetterAuthOptions | undefined {
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
    database: options.pool,
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
