import { describe, expect, test } from "bun:test";

import {
  isValidEmail,
  normalizeEmail,
  PASSWORD_MIN_LENGTH,
  validateSignIn,
  validateSignUp,
} from "./auth.ts";

describe("auth validation", () => {
  test("normalizes and validates email shape", () => {
    expect(normalizeEmail("  Renewer@Example.COM ")).toBe("renewer@example.com");
    expect(isValidEmail("renewer@example.com")).toBe(true);
    expect(isValidEmail("not-an-email")).toBe(false);
    expect(isValidEmail("missing@domain")).toBe(false);
  });

  test("accepts a complete sign-up", () => {
    expect(
      validateSignUp({
        name: "EAD Renewer",
        email: "renewer@example.com",
        password: "supersecret",
      })
    ).toEqual({ isValid: true, errors: {} });
  });

  test("flags every missing or malformed sign-up field", () => {
    const result = validateSignUp({ name: "  ", email: "bad", password: "short" });
    expect(result.isValid).toBe(false);
    expect(result.errors.name).toBeDefined();
    expect(result.errors.email).toBeDefined();
    expect(result.errors.password).toContain(String(PASSWORD_MIN_LENGTH));
  });

  test("trims an overly long name", () => {
    const result = validateSignUp({
      name: "x".repeat(200),
      email: "renewer@example.com",
      password: "supersecret",
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.name).toBeDefined();
  });

  test("accepts a sign-in with email + non-empty password", () => {
    expect(validateSignIn({ email: "renewer@example.com", password: "x" })).toEqual({
      isValid: true,
      errors: {},
    });
  });

  test("requires email and password on sign-in", () => {
    const result = validateSignIn({ email: "", password: "" });
    expect(result.isValid).toBe(false);
    expect(result.errors.email).toBeDefined();
    expect(result.errors.password).toBeDefined();
  });
});
