import { describe, expect, test } from "bun:test";
import type { Pool } from "pg";

import { buildAuthOptions } from "./auth";

// buildAuthOptions only assigns the pool to `database`; it never queries it, so a
// bare object is a safe stand-in for these pure configuration assertions.
const fakePool = {} as unknown as Pool;

describe("buildAuthOptions", () => {
  test("returns undefined until base URL and secret are configured", () => {
    expect(buildAuthOptions({ pool: fakePool })).toBeUndefined();
    expect(
      buildAuthOptions({ pool: fakePool, baseUrl: "https://api.example.com" })
    ).toBeUndefined();
    expect(buildAuthOptions({ pool: fakePool, secret: "shh" })).toBeUndefined();
  });

  test("enables the email/password account path with a synced minimum length", () => {
    const options = buildAuthOptions({
      pool: fakePool,
      baseUrl: "https://api.example.com",
      secret: "shh",
    });

    expect(options?.emailAndPassword?.enabled).toBe(true);
    expect(options?.emailAndPassword?.requireEmailVerification).toBe(false);
    expect(options?.emailAndPassword?.minPasswordLength).toBe(8);
  });

  test("omits Google until both client credentials are present", () => {
    const withoutGoogle = buildAuthOptions({
      pool: fakePool,
      baseUrl: "https://api.example.com",
      secret: "shh",
    });
    expect(withoutGoogle?.socialProviders).toEqual({});

    const partialGoogle = buildAuthOptions({
      pool: fakePool,
      baseUrl: "https://api.example.com",
      secret: "shh",
      googleClientId: "client-id",
    });
    expect(partialGoogle?.socialProviders).toEqual({});
  });

  test("configures Google when both client credentials are present", () => {
    const options = buildAuthOptions({
      pool: fakePool,
      baseUrl: "https://api.example.com",
      secret: "shh",
      googleClientId: "client-id",
      googleClientSecret: "client-secret",
    });

    expect(options?.socialProviders?.google).toEqual({
      clientId: "client-id",
      clientSecret: "client-secret",
    });
  });

  test("uses secure cookies only for https base URLs", () => {
    const https = buildAuthOptions({
      pool: fakePool,
      baseUrl: "https://api.example.com",
      secret: "shh",
    });
    const http = buildAuthOptions({
      pool: fakePool,
      baseUrl: "http://localhost:3000",
      secret: "shh",
    });

    expect(https?.advanced?.useSecureCookies).toBe(true);
    expect(http?.advanced?.useSecureCookies).toBe(false);
  });
});
