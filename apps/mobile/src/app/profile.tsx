import type { JSX } from "react";
import { useRouter } from "expo-router";

import { ProfileScreenContent } from "@/features/profile/profile-screen";

export default function ProfileModal(): JSX.Element {
  const router = useRouter();
  return <ProfileScreenContent onClose={() => router.back()} />;
}
