import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { Button } from "heroui-native";

import { GlassCard } from "./glass";
import { colors, fonts, glass } from "./tokens";

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
  backTestID?: string;
  continueTestID?: string;
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
  backTestID,
  continueTestID,
  children,
}: WizardScaffoldProps) {
  const progress = Math.max(0, Math.min(1, (stepIndex + 1) / stepCount));
  const currentStep = Math.min(stepCount, Math.max(1, stepIndex + 1));

  return (
    <GlassCard elevated intensity={40} padding={18}>
      <View className="gap-5">
        <View className="gap-2">
          <View
            accessibilityLabel={`Wizard progress: step ${currentStep} of ${stepCount}`}
            accessibilityRole="progressbar"
            accessibilityValue={{ min: 0, max: stepCount, now: currentStep }}
            style={{ backgroundColor: glass.borderSoft, borderRadius: 999, height: 6 }}
          >
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
            <Text
              selectable
              style={{ color: colors.success, fontFamily: fonts.medium, fontSize: 12 }}
            >
              {savedLabel}
            </Text>
          </View>
        </View>
        <View className="gap-2">
          <Text
            selectable
            style={{
              color: colors.foreground,
              fontFamily: fonts.display,
              fontSize: 24,
              lineHeight: 30,
              letterSpacing: -0.3,
            }}
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
          <Button
            variant="outline"
            onPress={onBack}
            isDisabled={!onBack}
            className="flex-1"
            testID={backTestID}
          >
            Back
          </Button>
          <Button
            onPress={onContinue}
            isDisabled={!canContinue}
            className="flex-1"
            testID={continueTestID}
          >
            {continueLabel}
          </Button>
        </View>
      </View>
    </GlassCard>
  );
}
