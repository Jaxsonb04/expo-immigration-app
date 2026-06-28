import { describe, expect, test } from "bun:test";

import { buildAccountProfileModel } from "./profile-model.ts";

describe("profile model", () => {
  test("summarizes a Google-authenticated Railway profile without claiming PII storage", () => {
    expect(
      buildAccountProfileModel({
        isAuthenticated: true,
        user: {
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
      })
    ).toEqual({
      accountTitle: "EAD Renewer",
      accountDetail: "renewer@example.com · Google",
      authBadge: "Railway account",
      profileReadiness: "20% ready for pre-fill",
      privacyMode: "Metadata-only profile. Sensitive immigration fields stay gated behind KMS.",
      canSyncProfile: true,
    });
  });

  test("labels an email/password Railway account", () => {
    const model = buildAccountProfileModel({
      isAuthenticated: true,
      user: {
        email: "self-filer@example.com",
        name: "Self Filer",
        provider: "email",
      },
      profile: {
        displayName: "Self Filer",
        preferredLanguage: "en",
        hasReusableProfile: true,
        completionPercent: 20,
        piiMode: "metadata_only",
        storageMode: "database",
      },
    });

    expect(model.accountDetail).toBe("self-filer@example.com · Email");
    expect(model.authBadge).toBe("Railway account");
  });

  test("keeps a local exploration state when no authenticated account is present", () => {
    expect(
      buildAccountProfileModel({
        isAuthenticated: false,
        user: null,
        profile: null,
      })
    ).toEqual({
      accountTitle: "Local preview",
      accountDetail: "Sign in or create an account to sync your reusable profile.",
      authBadge: "Not synced",
      profileReadiness: "0% ready for pre-fill",
      privacyMode: "No server profile is loaded.",
      canSyncProfile: false,
    });
  });
});
