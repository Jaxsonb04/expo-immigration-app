import { createContext, use, useEffect, useMemo, useState, type ReactNode } from "react";

import type { AccountProfile, AccountUser } from "@/features/profile/profile-model";
import { API_BASE_URL, authClient } from "@/lib/auth-client";

interface AuthState {
  isAuthenticated: boolean;
  isGoogleAuthConfigured: boolean;
  isLoading: boolean;
  isPreview: boolean;
  user: AccountUser | null;
  profile: AccountProfile | null;
  signInWithGoogle: () => Promise<void>;
  signIn: () => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const session = authClient.useSession();
  const [isGoogleAuthConfigured, setIsGoogleAuthConfigured] = useState(false);
  const [isPreview, setIsPreview] = useState(false);
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const sessionUser = session.data?.user;
  const user = useMemo(
    () =>
      sessionUser
        ? {
            email: sessionUser.email,
            name: sessionUser.name,
            provider: "google" as const,
          }
        : null,
    [sessionUser]
  );

  useEffect(() => {
    let isActive = true;

    async function loadAuthStatus() {
      const response = await fetch(`${API_BASE_URL}/v1/auth/status`);
      const body = (await response.json()) as
        | { success: true; data: { googleConfigured: boolean } }
        | { success: false; error: string };

      if (isActive && body.success) {
        setIsGoogleAuthConfigured(body.data.googleConfigured);
      }
    }

    loadAuthStatus().catch(() => {
      if (isActive) {
        setIsGoogleAuthConfigured(false);
      }
    });

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    let isActive = true;

    async function loadProfile() {
      if (!sessionUser) {
        setProfile(null);
        return;
      }

      const cookie = authClient.getCookie();
      const response = await fetch(`${API_BASE_URL}/v1/profile`, {
        headers: cookie ? { cookie } : undefined,
      });
      const body = (await response.json()) as
        | { success: true; data: { profile: AccountProfile } }
        | { success: false; error: string };

      if (isActive && body.success) {
        setProfile(body.data.profile);
      }
    }

    loadProfile().catch(() => {
      if (isActive) {
        setProfile(null);
      }
    });

    return () => {
      isActive = false;
    };
  }, [sessionUser]);

  const value = useMemo<AuthState>(
    () => ({
      isAuthenticated: Boolean(user) || isPreview,
      isGoogleAuthConfigured,
      isLoading: session.isPending,
      isPreview,
      user,
      profile,
      signInWithGoogle: async () => {
        if (!isGoogleAuthConfigured) {
          return;
        }

        await authClient.signIn.social({ provider: "google" });
      },
      signIn: () => setIsPreview(true),
      signOut: async () => {
        setIsPreview(false);
        setProfile(null);
        if (user) {
          await authClient.signOut();
          await session.refetch();
        }
      },
    }),
    [isGoogleAuthConfigured, isPreview, profile, session, user]
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth(): AuthState {
  const ctx = use(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
