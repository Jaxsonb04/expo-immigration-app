import { Link } from "expo-router";
import { Button, Card, Typography } from "heroui-native";

import { Screen } from "@/components/screen";
import { useAuth } from "@/lib/auth-context";

export default function SignUpScreen() {
  const { isGoogleAuthConfigured, signIn, signInWithGoogle } = useAuth();

  return (
    <Screen title="Create your account" subtitle="Save your info once, reuse it on every renewal.">
      <Card className="gap-3 p-4">
        <Typography.Paragraph className="opacity-60">
          Use Google to create a Better Auth account on the Railway backend. The first profile
          record is metadata-only until the encryption gate clears.
        </Typography.Paragraph>
        <Button onPress={signInWithGoogle}>
          {isGoogleAuthConfigured ? "Continue with Google" : "Google setup pending"}
        </Button>
        {!isGoogleAuthConfigured ? (
          <Typography.Paragraph className="opacity-60">
            Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET on Railway to enable live Google sign-up.
          </Typography.Paragraph>
        ) : null}
        <Button variant="outline" onPress={signIn}>
          Preview locally
        </Button>
      </Card>
      <Link href="/">
        <Typography.Paragraph className="opacity-80">
          Already have an account? Sign in
        </Typography.Paragraph>
      </Link>
    </Screen>
  );
}
