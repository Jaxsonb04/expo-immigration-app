import { useState } from "react";
import { Text, View } from "react-native";
import { Button, Card } from "heroui-native";

import { Screen } from "@/components/screen";
import { useLoopSnapshot } from "@/features/loop/use-loop-snapshot";
import { SectionHeader } from "@/features/ui/section-header";
import { SelectionCard } from "@/features/ui/selection-card";
import { WizardScaffold } from "@/features/ui/wizard-scaffold";
import { cardStyle, colors, fonts } from "@/features/ui/tokens";

import { getWizardStep, wizardSteps } from "./wizard-model";

export function FilingsScreenContent() {
  const snapshot = useLoopSnapshot();
  const [stepIndex, setStepIndex] = useState(0);
  const [reason, setReason] = useState<string | undefined>();
  const [category, setCategory] = useState<string | undefined>();
  const [reviewAck, setReviewAck] = useState(false);
  const step = getWizardStep(stepIndex);

  const canContinue =
    (step.id === "reason" && Boolean(reason)) ||
    (step.id === "eligibility" && Boolean(category)) ||
    (step.id === "review" && reviewAck) ||
    !["reason", "eligibility", "review"].includes(step.id);

  return (
    <Screen title="Filings" subtitle="Drafts and the I-765 renewal wizard.">
      <Card className="gap-3 p-4" style={cardStyle}>
        <SectionHeader title="Current draft" actionLabel="Local preview" />
        <Text selectable style={{ color: colors.foreground, fontFamily: fonts.semibold, fontSize: 16 }}>
          {snapshot.activeApplication?.title ?? "I-765 EAD renewal"}
        </Text>
        <Text selectable style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 13 }}>
          {snapshot.activeApplication?.currentStep ?? 0} of {snapshot.activeApplication?.totalSteps ?? 10}{" "}
          steps complete in the preview data. Export means a PDF for you to file yourself.
        </Text>
      </Card>

      <Card className="gap-4 p-4" style={cardStyle}>
        <Text selectable style={{ color: colors.foreground, fontFamily: fonts.display, fontSize: 22 }}>
          Before you begin
        </Text>
        <Text selectable style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 14, lineHeight: 21 }}>
          About 15 minutes · designed for save-and-resume · gather your current EAD and category
          proof · not legal advice.
        </Text>
        <View className="flex-row justify-between gap-2">
          {["Basics", "Eligibility", "Docs", "Review"].map((label, index) => (
            <View key={label} className="flex-1 items-center gap-2">
              <View
                style={{
                  backgroundColor: index === 0 ? colors.accent : "#EEEAE0",
                  borderRadius: 999,
                  height: 10,
                  width: 10,
                }}
              />
              <Text selectable style={{ color: colors.muted, fontFamily: fonts.medium, fontSize: 11 }}>
                {label}
              </Text>
            </View>
          ))}
        </View>
      </Card>

      <WizardScaffold
        eyebrow={step.eyebrow}
        title={step.title}
        description={step.description}
        stepIndex={stepIndex}
        stepCount={wizardSteps.length}
        savedLabel="Preview state"
        canContinue={canContinue}
        continueLabel={step.continueLabel}
        onBack={stepIndex > 0 ? () => setStepIndex((value) => value - 1) : undefined}
        onContinue={
          stepIndex < wizardSteps.length - 1 ? () => setStepIndex((value) => value + 1) : undefined
        }
      >
        {step.requiresLegalAcknowledgment ? (
          <Card className="gap-1 p-3" variant="secondary">
            <Text selectable style={{ color: colors.warning, fontFamily: fonts.semibold, fontSize: 13 }}>
              User decision required
            </Text>
            <Text selectable style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 12 }}>
              This step may involve legal judgment. The app asks; it does not decide.
            </Text>
          </Card>
        ) : null}

        {step.id === "reason" ? (
          <>
            {[
              ["renewal", "Renewal", "You are renewing an existing EAD."],
              ["replacement", "Replacement", "Your EAD was lost, stolen, or needs correction."],
              ["initial", "Initial", "You are applying for employment authorization for the first time."],
            ].map(([value, title, description]) => (
              <SelectionCard
                key={value}
                title={title}
                description={description}
                selected={reason === value}
                onPress={() => setReason(value)}
              />
            ))}
          </>
        ) : null}

        {step.id === "eligibility" ? (
          <>
            {[
              ["c8", "(c)(8) Pending asylum", "Requires pending I-589 evidence."],
              ["c9", "(c)(9) Adjustment of status", "Requires pending I-485 evidence."],
              ["c33", "(c)(33) DACA", "Requires I-821D and I-765WS context."],
            ].map(([value, title, description]) => (
              <SelectionCard
                key={value}
                title={title}
                description={description}
                selected={category === value}
                onPress={() => setCategory(value)}
              />
            ))}
          </>
        ) : null}

        {step.id === "review" ? (
          <SelectionCard
            title="I reviewed and verified my answers"
            description="The exported PDF is yours to sign and file. This is not USCIS submission."
            selected={reviewAck}
            onPress={() => setReviewAck((value) => !value)}
          />
        ) : null}

        {!["reason", "eligibility", "review"].includes(step.id) ? (
          <Text selectable style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 14, lineHeight: 21 }}>
            This shell shows the designed step structure. Backend form data, encrypted PII, and PDF generation stay behind the documented gates.
          </Text>
        ) : null}
      </WizardScaffold>

      <Button variant="ghost">Find recognized legal help</Button>
    </Screen>
  );
}
