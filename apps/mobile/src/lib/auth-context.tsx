import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  normalizeEmail,
  validateSignIn,
  validateSignUp,
  type AuthFieldErrors,
  type AuthStatus,
  type SignInInput,
  type SignUpInput,
} from "@immigration/shared";

import type { AccountProfile, AccountProvider, AccountUser } from "@/features/profile/profile-model";
import { API_BASE_URL, authClient } from "@/lib/auth-client";

interface AuthState {
  isAuthenticated: boolean;
  isGoogleAuthConfigured: boolean;
  isEmailPasswordEnabled: boolean;
  isLoading: boolean;
  isSubmitting: boolean;
  isPreview: boolean;
  user: AccountUser | null;
  profile: AccountProfile | null;
  authError: string | null;
  fieldErrors: AuthFieldErrors;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (input: SignInInput) => Promise<boolean>;
  signUpWithEmail: (input: SignUpInput) => Promise<boolean>;
  signIn: () => void;
  signOut: () => Promise<void>;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

const NETWORK_ERROR = "Could not reach the server. Check your connection and try again.";
// Privacy-preserving messages: never reveal whether an email is already
// registered (this app serves users with heightened privacy needs).
const SIGN_UP_ERROR = "We couldn't create your account. Please check your details and try again.";
const SIGN_IN_ERROR = "Invalid email or password.";
const GOOGLE_ERROR = "Could not start Google sign-in. Try again.";

type AuthStatusResponse =
  | { success: true; data: AuthStatus }
  | { success: false; error: string };

type ProfileResponse =
  | { success: true; data: { user: { provider: AccountProvider }; profile: AccountProfile } }
  | { success: false; error: string };

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: sessionData, isPending: sessionIsPending, refetch: refetchSession } =
    authClient.useSession();
  const [isGoogleAuthConfigured, setIsGoogleAuthConfigured] = useState(false);
  const [isEmailPasswordEnabled, setIsEmailPasswordEnabled] = useState(false);
  const [isPreview, setIsPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [serverProvider, setServerProvider] = useState<AccountProvider>("unknown");
  const [authError, setAuthError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({});
  const sessionUser = sessionData?.user;

  const user = useMemo<AccountUser | null>(
    () =>
      sessionUser
        ? {
            email: sessionUser.email,
            name: sessionUser.name,
            provider: serverProvider,
          }
        : null,
    [serverProvider, sessionUser]
  );

  useEffect(() => {
    let isActive = true;

    async function loadAuthStatus() {
      const response = await fetch(`${API_BASE_URL}/v1/auth/status`);

      if (!response.ok) {
        if (isActive) {
          setIsGoogleAuthConfigured(false);
          setIsEmailPasswordEnabled(false);
        }
        return;
      }

      const body = (await response.json()) as AuthStatusResponse;

      if (!isActive) {
        return;
      }

      if (body.success) {
        setIsGoogleAuthConfigured(body.data.googleConfigured);
        setIsEmailPasswordEnabled(body.data.emailPasswordEnabled);
      } else {
        setIsGoogleAuthConfigured(false);
        setIsEmailPasswordEnabled(false);
      }
    }

    loadAuthStatus().catch(() => {
      if (isActive) {
        setIsGoogleAuthConfigured(false);
        setIsEmailPasswordEnabled(false);
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
        setServerProvider("unknown");
        return;
      }

      const cookie = authClient.getCookie();
      const response = await fetch(`${API_BASE_URL}/v1/profile`, {
        headers: cookie ? { cookie } : undefined,
      });

      if (!isActive) {
        return;
      }

      if (!response.ok) {
        setProfile(null);
        setServerProvider("unknown");
        return;
      }

      const body = (await response.json()) as ProfileResponse;

      if (!isActive) {
        return;
      }

      if (body.success) {
        setProfile(body.data.profile);
        setServerProvider(body.data.user.provider);
      } else {
        setProfile(null);
        setServerProvider("unknown");
      }
    }

    loadProfile().catch(() => {
      if (isActive) {
        setProfile(null);
        setServerProvider("unknown");
      }
    });

    return () => {
      isActive = false;
    };
  }, [sessionUser]);

  const clearAuthError = useCallback(() => {
    setAuthError(null);
    setFieldErrors({});
  }, []);

  const signUpWithEmail = useCallback(
    async (input: SignUpInput) => {
      const validation = validateSignUp(input);

      if (!validation.isValid) {
        setFieldErrors(validation.errors);
        setAuthError(null);
        return false;
      }

      setFieldErrors({});
      setAuthError(null);
      setIsSubmitting(true);

      try {
        const result = await authClient.signUp.email({
          name: input.name.trim(),
          email: normalizeEmail(input.email),
          password: input.password,
        });

        if (result.error) {
          setAuthError(SIGN_UP_ERROR);
          return false;
        }

        await refetchSession();
        return true;
      } catch {
        setAuthError(NETWORK_ERROR);
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [refetchSession]
  );

  const signInWithEmail = useCallback(
    async (input: SignInInput) => {
      const validation = validateSignIn(input);

      if (!validation.isValid) {
        setFieldErrors(validation.errors);
        setAuthError(null);
        return false;
      }

      setFieldErrors({});
      setAuthError(null);
      setIsSubmitting(true);

      try {
        const result = await authClient.signIn.email({
          email: normalizeEmail(input.email),
          password: input.password,
        });

        if (result.error) {
          setAuthError(SIGN_IN_ERROR);
          return false;
        }

        await refetchSession();
        return true;
      } catch {
        setAuthError(NETWORK_ERROR);
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [refetchSession]
  );

  const signInWithGoogle = useCallback(async () => {
    if (!isGoogleAuthConfigured) {
      return;
    }

    setAuthError(null);

    try {
      await authClient.signIn.social({ provider: "google" });
    } catch {
      setAuthError(GOOGLE_ERROR);
    }
  }, [isGoogleAuthConfigured]);

  const signIn = useCallback(() => setIsPreview(true), []);

  const signOut = useCallback(async () => {
    setIsPreview(false);
    setProfile(null);
    setServerProvider("unknown");
    setAuthError(null);
    setFieldErrors({});

    if (sessionUser) {
      await authClient.signOut();
      await refetchSession();
    }
  }, [refetchSession, sessionUser]);

  const value = useMemo<AuthState>(
    () => ({
      isAuthenticated: Boolean(user) || isPreview,
      isGoogleAuthConfigured,
      isEmailPasswordEnabled,
      isLoading: sessionIsPending,
      isSubmitting,
      isPreview,
      user,
      profile,
      authError,
      fieldErrors,
      signInWithGoogle,
      signInWithEmail,
      signUpWithEmail,
      signIn,
      signOut,
      clearAuthError,
    }),
    [
      authError,
      clearAuthError,
      fieldErrors,
      isEmailPasswordEnabled,
      isGoogleAuthConfigured,
      isPreview,
      isSubmitting,
      profile,
      sessionIsPending,
      signIn,
      signInWithEmail,
      signInWithGoogle,
      signOut,
      signUpWithEmail,
      user,
    ]
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
