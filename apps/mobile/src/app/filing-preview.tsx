import type { JSX } from "react";
import { useRouter } from "expo-router";

import { PreviewScreenContent } from "@/features/filings/preview-screen";

export default function FilingPreviewModal(): JSX.Element {
  const router = useRouter();
  return <PreviewScreenContent onClose={() => router.back()} />;
}
