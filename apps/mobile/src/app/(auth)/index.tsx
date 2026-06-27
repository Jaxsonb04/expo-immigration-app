import { Link } from "expo-router";
import { Button, Card, Typography } from "heroui-native";

import { Screen } from "@/components/screen";
import { useAuth } from "@/lib/auth-context";

export default function SignInScreen() {
  const { isGoogleAuthConfigured, signIn, signInWithGoogle } = useAuth();

  return (
    <Screen title="Welcome back" subtitle="Sign in to sync your reusable profile.">
      <Card className="gap-3 p-4">
        <Typography.Paragraph className="opacity-60">
          Google sign-in uses Better Auth on the Railway API. Your device stores only the session
          cookie; sensitive immigration profile fields stay gated until KMS is ready.
        </Typography.Paragraph>
        <Button onPress={signInWithGoogle} testID="auth-google-button">
          {isGoogleAuthConfigured ? "Continue with Google" : "Google setup pending"}
        </Button>
        {!isGoogleAuthConfigured ? (
          <Typography.Paragraph className="opacity-60">
            Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET on Railway to enable live Google sign-in.
          </Typography.Paragraph>
        ) : null}
        <Button variant="outline" onPress={signIn} testID="auth-continue-button">
          Preview locally
        </Button>
      </Card>
      <Link href="/sign-up">
        <Typography.Paragraph className="opacity-80">Need an account? Sign up</Typography.Paragraph>
      </Link>
    </Screen>
  );
}
