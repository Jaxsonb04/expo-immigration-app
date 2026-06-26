export interface ProfileSummary {
  displayName: string;
  preferredLanguage: "en" | "es" | "other";
  hasReusableProfile: boolean;
  completionPercent: number;
}
