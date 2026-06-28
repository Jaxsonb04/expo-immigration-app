import { Link } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";
import { Button, FieldError, Input, Label, TextField, Typography } from "heroui-native";

import { Screen } from "@/components/screen";
import { GlassCard } from "@/features/ui/glass";
import { colors, fonts } from "@/features/ui/tokens";
import { useAuth } from "@/lib/auth-context";

export default function SignInScreen() {
  const {
    authError,
    clearAuthError,
    fieldErrors,
    isGoogleAuthConfigured,
    isSubmitting,
    signIn,
    signInWithEmail,
    signInWithGoogle,
  } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleEmailSignIn() {
    await signInWithEmail({ email, password });
  }

  return (
    <Screen title="Welcome back" subtitle="Sign in to sync your reusable profile." showProfile={false}>
      <GlassCard elevated intensity={40} padding={18}>
        <View style={{ gap: 16 }}>
          <TextField isInvalid={Boolean(fieldErrors.email)}>
            <Label>Email</Label>
            <Input
              accessibilityLabel="Email"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
              keyboardType="email-address"
              onChangeText={(value) => {
                setEmail(value);
                clearAuthError();
              }}
              placeholder="you@example.com"
              testID="auth-email-input"
              value={email}
            />
            {fieldErrors.email ? <FieldError>{fieldErrors.email}</FieldError> : null}
          </TextField>

          <TextField isInvalid={Boolean(fieldErrors.password)}>
            <Label>Password</Label>
            <Input
              accessibilityLabel="Password"
              autoCapitalize="none"
              autoComplete="current-password"
              onChangeText={(value) => {
                setPassword(value);
                clearAuthError();
              }}
              placeholder="Your password"
              secureTextEntry
              testID="auth-password-input"
              value={password}
            />
            {fieldErrors.password ? <FieldError>{fieldErrors.password}</FieldError> : null}
          </TextField>

          {authError ? (
            <Text
              accessibilityLiveRegion="polite"
              accessibilityRole="alert"
              selectable
              style={{ color: colors.danger, fontFamily: fonts.medium, fontSize: 13 }}
              testID="auth-error"
            >
              {authError}
            </Text>
          ) : null}

          <Button isDisabled={isSubmitting} onPress={handleEmailSignIn} testID="auth-email-sign-in">
            {isSubmitting ? "Signing in…" : "Sign in"}
          </Button>
        </View>
      </GlassCard>

      <View className="gap-3">
        <Text
          style={{
            color: colors.hint,
            fontFamily: fonts.medium,
            fontSize: 12,
            textAlign: "center",
          }}
        >
          Or continue another way
        </Text>
        <Button
          isDisabled={!isGoogleAuthConfigured}
          onPress={signInWithGoogle}
          testID="auth-google-button"
          variant="outline"
        >
          {isGoogleAuthConfigured ? "Continue with Google" : "Google setup pending"}
        </Button>
        <Button onPress={signIn} testID="auth-continue-button" variant="ghost">
          Preview locally
        </Button>
      </View>

      <Link href="/sign-up">
        <Typography.Paragraph className="opacity-80">
          Need an account? Create one
        </Typography.Paragraph>
      </Link>
    </Screen>
  );
}
