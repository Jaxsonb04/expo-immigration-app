import { Link } from "expo-router";
import { Button, Card, Typography } from "heroui-native";

import { Screen } from "@/components/screen";
import { useAuth } from "@/lib/auth-context";

export default function SignInScreen() {
  const { signIn } = useAuth();

  return (
    <Screen title="Welcome back" subtitle="Sign in to your immigration companion.">
      <Card className="gap-3 p-4">
        <Typography.Paragraph className="opacity-60">
          Email/password auth (Better Auth + secure storage) is wired in Phase 2. This is a
          placeholder so the navigation flow works end to end.
        </Typography.Paragraph>
        <Button onPress={signIn} testID="auth-continue-button">
          Continue
        </Button>
      </Card>
      <Link href="/sign-up">
        <Typography.Paragraph className="opacity-80">Need an account? Sign up</Typography.Paragraph>
      </Link>
    </Screen>
  );
}
