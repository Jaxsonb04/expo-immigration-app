import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { Button, Card } from "heroui-native";

import { cardStyle, colors, fonts } from "./tokens";

interface WizardScaffoldProps {
  eyebrow: string;
  title: string;
  description: string;
  stepIndex: number;
  stepCount: number;
  savedLabel: string;
  canContinue: boolean;
  onBack?: () => void;
  onContinue?: () => void;
  continueLabel?: string;
  children: ReactNode;
}

export function WizardScaffold({
  eyebrow,
  title,
  description,
  stepIndex,
  stepCount,
  savedLabel,
  canContinue,
  onBack,
  onContinue,
  continueLabel = "Continue",
  children,
}: WizardScaffoldProps) {
  const progress = Math.max(0, Math.min(1, (stepIndex + 1) / stepCount));

  return (
    <Card className="gap-5 p-4" style={cardStyle}>
      <View className="gap-2">
        <View style={{ backgroundColor: "#EEEAE0", borderRadius: 999, height: 6 }}>
          <View
            style={{
              backgroundColor: colors.accent,
              borderRadius: 999,
              height: 6,
              width: `${progress * 100}%`,
            }}
          />
        </View>
        <View className="flex-row items-center justify-between">
          <Text selectable style={{ color: colors.muted, fontFamily: fonts.medium, fontSize: 12 }}>
            {eyebrow}
          </Text>
          <Text selectable style={{ color: colors.success, fontFamily: fonts.medium, fontSize: 12 }}>
            {savedLabel}
          </Text>
        </View>
      </View>
      <View className="gap-2">
        <Text
          selectable
          style={{ color: colors.foreground, fontFamily: fonts.display, fontSize: 23 }}
        >
          {title}
        </Text>
        <Text
          selectable
          style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 14, lineHeight: 21 }}
        >
          {description}
        </Text>
      </View>
      <View className="gap-3">{children}</View>
      <View className="flex-row gap-3">
        <Button variant="outline" onPress={onBack} isDisabled={!onBack} className="flex-1">
          Back
        </Button>
        <Button onPress={onContinue} isDisabled={!canContinue} className="flex-1">
          {continueLabel}
        </Button>
      </View>
    </Card>
  );
}
