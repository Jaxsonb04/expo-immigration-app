/**
 * Shared auth contracts + form validation.
 *
 * Pure, dependency-free helpers used by the mobile client to validate the
 * sign-in / "create your own account" forms before calling Better Auth, and to
 * type the GET /v1/auth/status response. Better Auth performs the authoritative
 * server-side validation; this keeps the client UX consistent and unit-testable
 * without a network round-trip. Keep the password rules in sync with the
 * server's Better Auth `emailAndPassword` config.
 */

/** Which provider an authenticated user signed in with (display-only metadata). */
export type AuthProvider = "google" | "email" | "unknown";

/** Response shape for GET /v1/auth/status. */
export interface AuthStatus {
  /** Legacy single-provider hint kept for backward compatibility. */
  provider: "google";
  /** Whether live Google OAuth credentials are configured on the server. */
  googleConfigured: boolean;
  /** Whether email/password ("create your own account") sign-in is enabled. */
  emailPasswordEnabled: boolean;
}

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;
export const NAME_MAX_LENGTH = 80;

// Pragmatic email shape check — not full RFC 5322, just enough to catch typos
// before the request. The server remains the source of truth for acceptance.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return EMAIL_PATTERN.test(normalizeEmail(email));
}

export interface SignUpInput {
  name: string;
  email: string;
  password: string;
}

export interface SignInInput {
  email: string;
  password: string;
}

export interface AuthFieldErrors {
  name?: string;
  email?: string;
  password?: string;
}

export interface AuthValidationResult {
  isValid: boolean;
  errors: AuthFieldErrors;
}

function validatePassword(password: string): string | undefined {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Use at least ${PASSWORD_MIN_LENGTH} characters.`;
  }

  if (password.length > PASSWORD_MAX_LENGTH) {
    return `Use at most ${PASSWORD_MAX_LENGTH} characters.`;
  }

  return undefined;
}

function validateEmailField(email: string): string | undefined {
  if (normalizeEmail(email).length === 0) {
    return "Enter your email.";
  }

  if (!isValidEmail(email)) {
    return "Enter a valid email address.";
  }

  return undefined;
}

export function validateSignUp(input: SignUpInput): AuthValidationResult {
  const errors: AuthFieldErrors = {};
  const name = input.name.trim();

  if (name.length === 0) {
    errors.name = "Enter your name.";
  } else if (name.length > NAME_MAX_LENGTH) {
    errors.name = `Use at most ${NAME_MAX_LENGTH} characters.`;
  }

  const emailError = validateEmailField(input.email);
  if (emailError) {
    errors.email = emailError;
  }

  const passwordError = validatePassword(input.password);
  if (passwordError) {
    errors.password = passwordError;
  }

  return { isValid: Object.keys(errors).length === 0, errors };
}

export function validateSignIn(input: SignInInput): AuthValidationResult {
  const errors: AuthFieldErrors = {};

  const emailError = validateEmailField(input.email);
  if (emailError) {
    errors.email = emailError;
  }

  if (input.password.length === 0) {
    errors.password = "Enter your password.";
  }

  return { isValid: Object.keys(errors).length === 0, errors };
}
