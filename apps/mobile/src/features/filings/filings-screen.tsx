import { useState } from "react";
import { Text, View } from "react-native";
import { Button } from "heroui-native";
import { useRouter } from "expo-router";
import { getI765FullCompletionPercent } from "@immigration/shared";

import { Screen } from "@/components/screen";
import { localLoopRepository } from "@/features/loop/repository";
import { GlassCard } from "@/features/ui/glass";
import { SectionHeader } from "@/features/ui/section-header";
import { WizardScaffold } from "@/features/ui/wizard-scaffold";
import { colors, fonts } from "@/features/ui/tokens";

import { useI765Draft } from "./draft-store";
import { getStepCanContinue, StepBody, WIZARD_STEP_COUNT, WIZARD_STEPS } from "./wizard-steps";

export function FilingsScreenContent() {
  const router = useRouter();
  const draft = useI765Draft();
  const [stepIndex, setStepIndex] = useState(0);

  const step = WIZARD_STEPS[stepIndex];
  const isLastStep = stepIndex === WIZARD_STEP_COUNT - 1;
  const canContinue = getStepCanContinue(step.id, draft.answers);
  const completion = getI765FullCompletionPercent(draft.answers);

  /** Keep the legacy non-PII loop draft in sync so Home's progress stays live. */
  function handleExecutableChoice(patch: Record<string, unknown>) {
    localLoopRepository.saveI765DraftPatch({
      patch,
      currentStep: stepIndex + 1,
      savedAt: new Date().toISOString(),
    });
  }

  async function handleExport() {
    await draft.flush();
    router.push("/filing-preview");
  }

  return (
    <Screen title="Filings" subtitle="Fill the I-765 step by step, then preview and export.">
      <GlassCard padding={16}>
        <View className="gap-3">
          <SectionHeader title="I-765 · Employment Authorization" actionLabel={`${completion}%`} />
          <View style={{ backgroundColor: colors.accentSoft, borderRadius: 999, height: 6 }}>
            <View
              style={{
                backgroundColor: colors.accent,
                borderRadius: 999,
                height: 6,
                width: `${completion}%`,
              }}
            />
          </View>
          <Text
            style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 13, lineHeight: 19 }}
          >
            About 15 minutes · saved on your device as you go · edition 08/21/25. Creating the PDF
            does not submit anything to USCIS — you print, sign, and file it yourself. Not legal
            advice.
          </Text>
        </View>
      </GlassCard>

      <WizardScaffold
        eyebrow={step.eyebrow}
        title={step.title}
        description={step.description}
        stepIndex={stepIndex}
        stepCount={WIZARD_STEP_COUNT}
        savedLabel={draft.ready ? "Saved on device" : "Loading…"}
        canContinue={canContinue}
        continueLabel={step.continueLabel}
        backTestID="filing-wizard-back"
        continueTestID="filing-wizard-continue"
        onBack={stepIndex > 0 ? () => setStepIndex((value) => value - 1) : undefined}
        onContinue={isLastStep ? handleExport : () => setStepIndex((value) => value + 1)}
      >
        <StepBody stepId={step.id} draft={draft} onExecutableChoice={handleExecutableChoice} />
      </WizardScaffold>

      <Button variant="ghost" onPress={() => router.push("/profile")}>
        Find recognized legal help
      </Button>
    </Screen>
  );
}
