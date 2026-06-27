import { useState } from "react";
import { Text, View } from "react-native";
import { Button, Card } from "heroui-native";
import type { I765DraftAnswers, I765EligibilityCategory, I765Reason } from "@immigration/shared";

import { Screen } from "@/components/screen";
import { localLoopRepository } from "@/features/loop/repository";
import { useLoopSnapshot } from "@/features/loop/use-loop-snapshot";
import { SectionHeader } from "@/features/ui/section-header";
import { SelectionCard } from "@/features/ui/selection-card";
import { WizardScaffold } from "@/features/ui/wizard-scaffold";
import { cardStyle, colors, fonts } from "@/features/ui/tokens";

import { getWizardCanContinue, getWizardStep, wizardSteps } from "./wizard-model";

const reasonOptions: readonly {
  value: I765Reason;
  title: string;
  description: string;
}[] = [
  { value: "renewal", title: "Renewal", description: "You are renewing an existing EAD." },
  { value: "replacement", title: "Replacement", description: "Your EAD was lost, stolen, or needs correction." },
  { value: "initial", title: "Initial", description: "You are applying for employment authorization for the first time." },
];

const eligibilityOptions: readonly {
  value: I765EligibilityCategory;
  title: string;
  description: string;
}[] = [
  { value: "c8", title: "(c)(8) Pending asylum", description: "Requires pending I-589 evidence." },
  { value: "c9", title: "(c)(9) Adjustment of status", description: "Requires pending I-485 evidence." },
  { value: "c33", title: "(c)(33) DACA", description: "Requires I-821D and I-765WS context." },
];

export function FilingsScreenContent() {
  const snapshot = useLoopSnapshot();
  const [stepIndex, setStepIndex] = useState(0);
  const [draftAnswers, setDraftAnswers] = useState<I765DraftAnswers>(
    () => snapshot.activeApplication?.answers ?? {},
  );
  const [draftProgress, setDraftProgress] = useState(() => ({
    currentStep: snapshot.activeApplication?.currentStep ?? 0,
    completionPercent: snapshot.activeApplication?.completionPercent ?? 0,
    updatedAt: snapshot.activeApplication?.updatedAt,
  }));
  const step = getWizardStep(stepIndex);

  const canContinue = getWizardCanContinue(step.id, draftAnswers);

  function saveDraftPatch(patch: Record<string, unknown>) {
    const result = localLoopRepository.saveI765DraftPatch({
      patch,
      currentStep: stepIndex + 1,
      savedAt: new Date().toISOString(),
    });

    if (result.acceptedKeys.length === 0) {
      return;
    }

    const savedDraft = localLoopRepository.getSnapshot().activeApplication;

    setDraftAnswers(result.answers);
    setDraftProgress({
      currentStep: savedDraft?.currentStep ?? stepIndex + 1,
      completionPercent: savedDraft?.completionPercent ?? 0,
      updatedAt: savedDraft?.updatedAt,
    });
  }

  return (
    <Screen title="Filings" subtitle="Drafts and the I-765 renewal wizard.">
      <Card className="gap-3 p-4" style={cardStyle}>
        <SectionHeader title="Current draft" actionLabel="Local preview" />
        <Text selectable style={{ color: colors.foreground, fontFamily: fonts.semibold, fontSize: 16 }}>
          {snapshot.activeApplication?.title ?? "I-765 EAD renewal"}
        </Text>
        <Text selectable style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 13 }}>
          {draftProgress.currentStep} of {snapshot.activeApplication?.totalSteps ?? wizardSteps.length} steps
          touched · {draftProgress.completionPercent}% of executable local choices complete. Export means a
          PDF for you to file yourself.
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
        savedLabel={draftProgress.updatedAt ? "Autosaved locally" : "Local preview"}
        canContinue={canContinue}
        continueLabel={step.continueLabel}
        backTestID="filing-wizard-back"
        continueTestID="filing-wizard-continue"
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
            {reasonOptions.map(({ value, title, description }) => (
              <SelectionCard
                key={value}
                title={title}
                description={description}
                selected={draftAnswers.reason === value}
                controlRole="radio"
                testID={`filing-reason-${value}`}
                onPress={() => saveDraftPatch({ reason: value })}
              />
            ))}
          </>
        ) : null}

        {step.id === "eligibility" ? (
          <>
            {eligibilityOptions.map(({ value, title, description }) => (
              <SelectionCard
                key={value}
                title={title}
                description={description}
                selected={draftAnswers.eligibilityCategory === value}
                controlRole="radio"
                testID={`filing-eligibility-${value}`}
                onPress={() => saveDraftPatch({ eligibilityCategory: value })}
              />
            ))}
          </>
        ) : null}

        {step.id === "review" ? (
          <SelectionCard
            title="I reviewed and verified my answers"
            description="The exported PDF is yours to sign and file. This is not USCIS submission."
            selected={draftAnswers.reviewAcknowledged === true}
            controlRole="checkbox"
            testID="filing-review-acknowledgement"
            onPress={() => saveDraftPatch({ reviewAcknowledged: draftAnswers.reviewAcknowledged !== true })}
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
