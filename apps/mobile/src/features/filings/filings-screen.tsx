import { useState } from "react";
import { Text, View } from "react-native";
import { Button, Description, Input, Label, Radio, TextField } from "heroui-native";
import {
  Calendar,
  DatePicker,
  RadioButtonGroup,
  type DatePickerOption,
} from "heroui-native-pro";
import type { I765DraftAnswers, I765EligibilityCategory, I765Reason } from "@immigration/shared";

import { Screen } from "@/components/screen";
import { localLoopRepository } from "@/features/loop/repository";
import { useLoopSnapshot } from "@/features/loop/use-loop-snapshot";
import { GlassCard } from "@/features/ui/glass";
import { SectionHeader } from "@/features/ui/section-header";
import { SelectionCard } from "@/features/ui/selection-card";
import { WizardScaffold } from "@/features/ui/wizard-scaffold";
import { colors, fonts } from "@/features/ui/tokens";

import { getWizardCanContinue, getWizardStep, wizardSteps } from "./wizard-model";

const reasonOptions: readonly { value: I765Reason; title: string; description: string }[] = [
  { value: "renewal", title: "Renewal", description: "You are renewing an existing EAD." },
  {
    value: "replacement",
    title: "Replacement",
    description: "Your EAD was lost, stolen, or needs correction.",
  },
  {
    value: "initial",
    title: "Initial",
    description: "First-time application for employment authorization.",
  },
];

const eligibilityOptions: readonly {
  value: I765EligibilityCategory;
  title: string;
  description: string;
}[] = [
  { value: "c8", title: "(c)(8) Pending asylum", description: "Requires pending I-589 evidence." },
  {
    value: "c9",
    title: "(c)(9) Adjustment of status",
    description: "Requires pending I-485 evidence.",
  },
  { value: "c33", title: "(c)(33) DACA", description: "Requires I-821D and I-765WS context." },
];

// In-memory only. Sensitive identity fields are NOT persisted (KMS-gated);
// they live in component state so the form is fully usable while draft sync
// stays limited to non-PII executable choices.
interface LocalIdentityDraft {
  firstName: string;
  lastName: string;
  mailingAddress: string;
  dateOfBirth?: DatePickerOption;
  aNumber: string;
}

const EMPTY_IDENTITY: LocalIdentityDraft = {
  firstName: "",
  lastName: "",
  mailingAddress: "",
  aNumber: "",
};

export function FilingsScreenContent() {
  const snapshot = useLoopSnapshot();
  const [stepIndex, setStepIndex] = useState(0);
  const [draftAnswers, setDraftAnswers] = useState<I765DraftAnswers>(
    () => snapshot.activeApplication?.answers ?? {}
  );
  const [identity, setIdentity] = useState<LocalIdentityDraft>(EMPTY_IDENTITY);
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

  function updateIdentity(patch: Partial<LocalIdentityDraft>) {
    setIdentity((current) => ({ ...current, ...patch }));
  }

  return (
    <Screen title="Filings" subtitle="Drafts and the I-765 renewal wizard.">
      <GlassCard padding={16}>
        <View className="gap-3">
          <SectionHeader title="Current draft" actionLabel="Local preview" />
          <Text
            selectable
            style={{ color: colors.foreground, fontFamily: fonts.semibold, fontSize: 16 }}
          >
            {snapshot.activeApplication?.title ?? "I-765 EAD renewal"}
          </Text>
          <Text selectable style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 13 }}>
            {draftProgress.currentStep} of{" "}
            {snapshot.activeApplication?.totalSteps ?? wizardSteps.length} steps touched ·{" "}
            {draftProgress.completionPercent}% of executable choices complete. Export means a PDF you
            file yourself.
          </Text>
        </View>
      </GlassCard>

      <GlassCard padding={18}>
        <View className="gap-4">
          <Text
            selectable
            style={{ color: colors.foreground, fontFamily: fonts.display, fontSize: 22 }}
          >
            Before you begin
          </Text>
          <Text
            selectable
            style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 14, lineHeight: 21 }}
          >
            About 15 minutes · designed for save-and-resume · gather your current EAD and category
            proof · not legal advice.
          </Text>
          <View className="flex-row justify-between gap-2">
            {["Basics", "Eligibility", "Docs", "Review"].map((label, index) => (
              <View key={label} className="flex-1 items-center gap-2">
                <View
                  style={{
                    backgroundColor: index === 0 ? colors.accent : colors.hint,
                    borderRadius: 999,
                    height: 9,
                    width: 9,
                  }}
                />
                <Text
                  selectable
                  style={{ color: colors.muted, fontFamily: fonts.medium, fontSize: 11 }}
                >
                  {label}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </GlassCard>

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
          <View
            style={{
              backgroundColor: "rgba(166,90,11,0.10)",
              borderColor: "rgba(166,90,11,0.25)",
              borderCurve: "continuous",
              borderRadius: 14,
              borderWidth: 1,
              gap: 2,
              padding: 12,
            }}
          >
            <Text
              selectable
              style={{ color: colors.warning, fontFamily: fonts.semibold, fontSize: 13 }}
            >
              User decision required
            </Text>
            <Text selectable style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 12 }}>
              This step may involve legal judgment. The app asks; it does not decide.
            </Text>
          </View>
        ) : null}

        {step.id === "reason" ? (
          <RadioButtonGroup
            variant="secondary"
            value={draftAnswers.reason}
            onValueChange={(value) => saveDraftPatch({ reason: value })}
          >
            {reasonOptions.map((option) => (
              <RadioButtonGroup.Item
                key={option.value}
                value={option.value}
                testID={`filing-reason-${option.value}`}
              >
                <Radio />
                <RadioButtonGroup.ItemContent>
                  <Label>{option.title}</Label>
                  <Description>{option.description}</Description>
                </RadioButtonGroup.ItemContent>
              </RadioButtonGroup.Item>
            ))}
          </RadioButtonGroup>
        ) : null}

        {step.id === "identity" ? (
          <View className="gap-4">
            <TextField>
              <Label>Legal first name</Label>
              <Input
                autoCapitalize="words"
                onChangeText={(value) => updateIdentity({ firstName: value })}
                placeholder="First name"
                testID="filing-first-name"
                value={identity.firstName}
              />
            </TextField>
            <TextField>
              <Label>Legal last name</Label>
              <Input
                autoCapitalize="words"
                onChangeText={(value) => updateIdentity({ lastName: value })}
                placeholder="Last name"
                testID="filing-last-name"
                value={identity.lastName}
              />
            </TextField>
            <Text selectable style={{ color: colors.hint, fontFamily: fonts.body, fontSize: 12 }}>
              Held on-device only. Encrypted server storage unlocks after KMS.
            </Text>
          </View>
        ) : null}

        {step.id === "address" ? (
          <TextField>
            <Label>Mailing address</Label>
            <Input
              autoCapitalize="words"
              onChangeText={(value) => updateIdentity({ mailingAddress: value })}
              placeholder="Street, city, state, ZIP"
              testID="filing-mailing-address"
              value={identity.mailingAddress}
            />
          </TextField>
        ) : null}

        {step.id === "biographic" ? (
          <View className="gap-4">
            <DatePicker
              value={identity.dateOfBirth}
              onValueChange={(value) => updateIdentity({ dateOfBirth: value })}
            >
              <Label>Date of birth</Label>
              <DatePicker.Select presentation="bottom-sheet">
                <DatePicker.Trigger testID="filing-dob-trigger">
                  <DatePicker.Value />
                  <DatePicker.TriggerIndicator />
                </DatePicker.Trigger>
                <DatePicker.Portal>
                  <DatePicker.Overlay />
                  <DatePicker.Content presentation="bottom-sheet">
                    <DatePicker.Calendar>
                      <Calendar.Header>
                        <Calendar.NavButton slot="previous" />
                        <Calendar.Heading />
                        <Calendar.NavButton slot="next" />
                      </Calendar.Header>
                      <Calendar.Grid>
                        <Calendar.GridHeader>
                          {(day) => <Calendar.HeaderCell day={day} />}
                        </Calendar.GridHeader>
                        <Calendar.GridBody>
                          {(date) => <Calendar.Cell date={date} />}
                        </Calendar.GridBody>
                      </Calendar.Grid>
                    </DatePicker.Calendar>
                  </DatePicker.Content>
                </DatePicker.Portal>
              </DatePicker.Select>
            </DatePicker>
            <TextField>
              <Label>A-number (optional)</Label>
              <Input
                autoCapitalize="characters"
                autoCorrect={false}
                onChangeText={(value) => updateIdentity({ aNumber: value })}
                placeholder="A123456789"
                testID="filing-a-number"
                value={identity.aNumber}
              />
              <Description>Optional until export. Held on-device only.</Description>
            </TextField>
          </View>
        ) : null}

        {step.id === "eligibility" ? (
          <RadioButtonGroup
            variant="secondary"
            value={draftAnswers.eligibilityCategory}
            onValueChange={(value) => saveDraftPatch({ eligibilityCategory: value })}
          >
            {eligibilityOptions.map((option) => (
              <RadioButtonGroup.Item
                key={option.value}
                value={option.value}
                testID={`filing-eligibility-${option.value}`}
              >
                <Radio />
                <RadioButtonGroup.ItemContent>
                  <Label>{option.title}</Label>
                  <Description>{option.description}</Description>
                </RadioButtonGroup.ItemContent>
              </RadioButtonGroup.Item>
            ))}
          </RadioButtonGroup>
        ) : null}

        {step.id === "review" ? (
          <SelectionCard
            title="I reviewed and verified my answers"
            description="The exported PDF is yours to sign and file. This is not USCIS submission."
            selected={draftAnswers.reviewAcknowledged === true}
            controlRole="checkbox"
            testID="filing-review-acknowledgement"
            onPress={() =>
              saveDraftPatch({ reviewAcknowledged: draftAnswers.reviewAcknowledged !== true })
            }
          />
        ) : null}

        {["status", "documents", "statement", "export"].includes(step.id) ? (
          <Text
            selectable
            style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 14, lineHeight: 21 }}
          >
            This step’s content is structured and ready. Backend form data, encrypted PII, and PDF
            generation stay behind the documented gates.
          </Text>
        ) : null}
      </WizardScaffold>

      <Button variant="ghost">Find recognized legal help</Button>
    </Screen>
  );
}
