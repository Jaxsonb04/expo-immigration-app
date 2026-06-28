export type AccountProvider = "google" | "email" | "unknown";
export type AccountProfileStorageMode = "database";
export type AccountProfilePiiMode = "metadata_only";

export interface AccountUser {
  email: string;
  name: string;
  provider: AccountProvider;
}

export interface AccountProfile {
  displayName: string;
  preferredLanguage: "en" | "es" | "other";
  hasReusableProfile: boolean;
  completionPercent: number;
  piiMode: AccountProfilePiiMode;
  storageMode: AccountProfileStorageMode;
}

export interface AccountProfileInput {
  isAuthenticated: boolean;
  user: AccountUser | null;
  profile: AccountProfile | null;
}

export interface AccountProfileModel {
  accountTitle: string;
  accountDetail: string;
  authBadge: string;
  profileReadiness: string;
  privacyMode: string;
  canSyncProfile: boolean;
}

export function buildAccountProfileModel(input: AccountProfileInput): AccountProfileModel {
  if (!input.isAuthenticated || !input.user || !input.profile) {
    return {
      accountTitle: "Local preview",
      accountDetail: "Sign in or create an account to sync your reusable profile.",
      authBadge: "Not synced",
      profileReadiness: "0% ready for pre-fill",
      privacyMode: "No server profile is loaded.",
      canSyncProfile: false,
    };
  }

  return {
    accountTitle: input.profile.displayName || input.user.name,
    accountDetail: `${input.user.email} · ${formatProvider(input.user.provider)}`,
    authBadge: "Railway account",
    profileReadiness: `${input.profile.completionPercent}% ready for pre-fill`,
    privacyMode: "Metadata-only profile. Sensitive immigration fields stay gated behind KMS.",
    canSyncProfile: input.profile.storageMode === "database",
  };
}

function formatProvider(provider: AccountProvider): string {
  if (provider === "google") {
    return "Google";
  }

  if (provider === "email") {
    return "Email";
  }

  return "Account";
}
