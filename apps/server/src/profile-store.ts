import type { Pool, QueryResultRow } from "pg";

export type PreferredLanguage = "en" | "es" | "other";
export type ProfileStorageMode = "database";
export type ProfilePiiMode = "metadata_only";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  provider: "google" | "unknown";
}

export interface StoredProfile {
  displayName: string;
  preferredLanguage: PreferredLanguage;
}

export interface ProfileResponse {
  displayName: string;
  preferredLanguage: PreferredLanguage;
  hasReusableProfile: boolean;
  completionPercent: number;
  piiMode: ProfilePiiMode;
  storageMode: ProfileStorageMode;
}

export interface ProfileUpdateInput {
  displayName?: string;
  preferredLanguage?: PreferredLanguage;
}

export interface ProfileStore {
  getOrCreateProfile(user: SessionUser): Promise<StoredProfile | undefined>;
  updateProfile(userId: string, input: ProfileUpdateInput): Promise<StoredProfile | undefined>;
}

interface ProfileRow extends QueryResultRow {
  display_name: string;
  preferred_language: PreferredLanguage;
}

export function formatProfile(profile: StoredProfile): ProfileResponse {
  const hasReusableProfile = profile.displayName.trim().length > 0;

  return {
    displayName: profile.displayName,
    preferredLanguage: profile.preferredLanguage,
    hasReusableProfile,
    completionPercent: hasReusableProfile ? 20 : 0,
    piiMode: "metadata_only",
    storageMode: "database",
  };
}

export class PostgresProfileStore implements ProfileStore {
  private readonly pool: Pool;
  private ready: Promise<void> | undefined;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async getOrCreateProfile(user: SessionUser): Promise<StoredProfile | undefined> {
    await this.ensureReady();
    const displayName = user.name.trim();

    await this.pool.query(
      `
        INSERT INTO applicant_profile (user_id, display_name, preferred_language)
        VALUES ($1, $2, 'en')
        ON CONFLICT (user_id) DO NOTHING
      `,
      [user.id, displayName]
    );

    const result = await this.pool.query<ProfileRow>(
      `
        SELECT display_name, preferred_language
        FROM applicant_profile
        WHERE user_id = $1
        LIMIT 1
      `,
      [user.id]
    );

    return mapProfileRow(result.rows[0]);
  }

  async updateProfile(
    userId: string,
    input: ProfileUpdateInput
  ): Promise<StoredProfile | undefined> {
    await this.ensureReady();

    const result = await this.pool.query<ProfileRow>(
      `
        INSERT INTO applicant_profile (user_id, display_name, preferred_language)
        VALUES ($1, COALESCE($2, ''), COALESCE($3, 'en'))
        ON CONFLICT (user_id) DO UPDATE SET
          display_name = COALESCE($2, applicant_profile.display_name),
          preferred_language = COALESCE($3, applicant_profile.preferred_language),
          updated_at = now()
        RETURNING display_name, preferred_language
      `,
      [userId, input.displayName, input.preferredLanguage]
    );

    return mapProfileRow(result.rows[0]);
  }

  private ensureReady(): Promise<void> {
    this.ready ??= this.pool
      .query(
        `
          CREATE TABLE IF NOT EXISTS applicant_profile (
            user_id text PRIMARY KEY,
            display_name text NOT NULL DEFAULT '',
            preferred_language text NOT NULL DEFAULT 'en',
            created_at timestamptz NOT NULL DEFAULT now(),
            updated_at timestamptz NOT NULL DEFAULT now(),
            CONSTRAINT applicant_profile_preferred_language_check
              CHECK (preferred_language IN ('en', 'es', 'other'))
          )
        `
      )
      .then(() => undefined);

    return this.ready;
  }
}

function mapProfileRow(row: ProfileRow | undefined): StoredProfile | undefined {
  if (!row) {
    return undefined;
  }

  return {
    displayName: row.display_name,
    preferredLanguage: row.preferred_language,
  };
}
