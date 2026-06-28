import { Link } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";
import { Button, Card, Description, FieldError, Input, Label, TextField, Typography } from "heroui-native";

import { Screen } from "@/components/screen";
import { cardStyle, colors, fonts } from "@/features/ui/tokens";
import { useAuth } from "@/lib/auth-context";

export default function SignUpScreen() {
  const {
    authError,
    clearAuthError,
    fieldErrors,
    isGoogleAuthConfigured,
    isSubmitting,
    signIn,
    signInWithGoogle,
    signUpWithEmail,
  } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleEmailSignUp() {
    await signUpWithEmail({ name, email, password });
  }

  return (
    <Screen title="Create your account" subtitle="Save your info once, reuse it on every renewal.">
      <Card className="gap-4 p-4" style={cardStyle}>
        <TextField isInvalid={Boolean(fieldErrors.name)}>
          <Label>Name</Label>
          <Input
            accessibilityLabel="Name"
            autoCapitalize="words"
            autoComplete="name"
            onChangeText={(value) => {
              setName(value);
              clearAuthError();
            }}
            placeholder="Your name"
            testID="auth-name-input"
            value={name}
          />
          {fieldErrors.name ? <FieldError>{fieldErrors.name}</FieldError> : null}
        </TextField>

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
            autoComplete="new-password"
            onChangeText={(value) => {
              setPassword(value);
              clearAuthError();
            }}
            placeholder="At least 8 characters"
            secureTextEntry
            testID="auth-password-input"
            value={password}
          />
          {fieldErrors.password ? (
            <FieldError>{fieldErrors.password}</FieldError>
          ) : (
            <Description>Use at least 8 characters.</Description>
          )}
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

        <Button isDisabled={isSubmitting} onPress={handleEmailSignUp} testID="auth-email-sign-up">
          {isSubmitting ? "Creating account…" : "Create account"}
        </Button>

        <Typography.Paragraph className="opacity-60" style={{ fontSize: 12 }}>
          Your device stores only the session cookie. Sensitive immigration fields stay gated until
          KMS encryption is ready.
        </Typography.Paragraph>
      </Card>

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

      <Link href="/">
        <Typography.Paragraph className="opacity-80">
          Already have an account? Sign in
        </Typography.Paragraph>
      </Link>
    </Screen>
  );
}
