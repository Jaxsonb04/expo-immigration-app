import { useMemo, useState } from "react";
import { Text, View } from "react-native";
import { Button, Card, Description, FieldError, Input, Label, TextField } from "heroui-native";

import { Screen } from "@/components/screen";
import { localLoopRepository } from "@/features/loop/repository";
import { useLoopSnapshot } from "@/features/loop/use-loop-snapshot";
import { EmptyState } from "@/features/ui/empty-state";
import { SectionHeader } from "@/features/ui/section-header";
import { TimelineItem } from "@/features/ui/timeline-item";
import { cardStyle, colors, fonts } from "@/features/ui/tokens";

import { buildReceiptEntryModel, buildTrackerModel } from "./tracker-model";

export function TrackerScreenContent() {
  const snapshot = useLoopSnapshot();
  const [receipt, setReceipt] = useState("");
  const [caseSummaries, setCaseSummaries] = useState(() => snapshot.cases ?? []);
  const [saveMessage, setSaveMessage] = useState<string | undefined>();
  const [saveError, setSaveError] = useState<string | undefined>();
  const caseSummary = caseSummaries[0];
  const receiptModel = useMemo(() => buildReceiptEntryModel(receipt), [receipt]);
  const model = useMemo(
    () => (caseSummary ? buildTrackerModel(caseSummary) : undefined),
    [caseSummary]
  );

  function saveManualCase() {
    const result = localLoopRepository.saveManualCaseReceipt({
      id: `case-${receiptModel.normalizedReceiptNumber.toLowerCase()}`,
      applicationId: snapshot.activeApplication?.id,
      receiptNumber: receipt,
      formCode: snapshot.activeApplication?.typeCode ?? "I-765",
      savedAt: new Date().toISOString(),
    });

    if (!result.accepted) {
      setSaveMessage(undefined);
      setSaveError("Receipt was not saved. Check the number from your USCIS notice.");
      return;
    }

    setCaseSummaries(localLoopRepository.getSnapshot().cases ?? []);
    setReceipt("");
    setSaveError(undefined);
    setSaveMessage(`Saved ${result.normalizedReceiptNumber} as a manual tracker case.`);
  }

  return (
    <Screen title="Tracker" subtitle="Manual-first case status.">
      <Card className="gap-4 p-4" style={cardStyle}>
        <SectionHeader title="Add receipt number" actionLabel="Manual" />
        <TextField isInvalid={Boolean(receiptModel.errorText || saveError)}>
          <Label>USCIS receipt number</Label>
          <Input
            accessibilityLabel="USCIS receipt number"
            autoCapitalize="characters"
            autoCorrect={false}
            value={receipt}
            onChangeText={setReceipt}
            placeholder="IOE1234567890"
            testID="tracker-receipt-input"
          />
          {receiptModel.helperText ? <Description>{receiptModel.helperText}</Description> : null}
          {receiptModel.errorText ? <FieldError>{receiptModel.errorText}</FieldError> : null}
          {saveError ? <FieldError>{saveError}</FieldError> : null}
        </TextField>
        {saveMessage ? (
          <Text selectable style={{ color: colors.success, fontFamily: fonts.medium, fontSize: 13 }}>
            {saveMessage}
          </Text>
        ) : null}
        <Button
          isDisabled={!receiptModel.canSave}
          onPress={saveManualCase}
          testID="tracker-save-manual-case"
        >
          Save manual case
        </Button>
      </Card>

      {caseSummary && model ? (
        <>
          <Card className="gap-3 p-4" style={cardStyle}>
            <View className="flex-row items-start justify-between gap-3">
              <View className="flex-1 gap-1">
                <Text selectable style={{ color: colors.muted, fontFamily: fonts.medium, fontSize: 12 }}>
                  {model.sourceLabel} · {model.receiptLabel}
                </Text>
                <Text selectable style={{ color: colors.foreground, fontFamily: fonts.display, fontSize: 23 }}>
                  {caseSummary.currentStatus}
                </Text>
                <Text selectable style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 14, lineHeight: 21 }}>
                  {caseSummary.currentStatusText}
                </Text>
              </View>
            </View>
            <Text selectable style={{ color: colors.warning, fontFamily: fonts.medium, fontSize: 13 }}>
              {model.syncDisclaimer}
            </Text>
          </Card>

          <Card className="gap-3 p-4" style={cardStyle}>
            <SectionHeader title="Processing context" />
            <Text selectable style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 13 }}>
              Cases like yours can take months. This bar is context only, not a prediction.
            </Text>
            <View style={{ backgroundColor: "#EEEAE0", borderRadius: 999, height: 8 }}>
              <View style={{ backgroundColor: colors.accent, borderRadius: 999, height: 8, width: "42%" }} />
            </View>
          </Card>

          <View className="gap-3">
            <SectionHeader title="Status timeline" />
            <Card className="p-4" style={cardStyle}>
              {caseSummary.events.map((event, index) => (
                <TimelineItem
                  key={event.id}
                  event={event}
                  isLast={index === caseSummary.events.length - 1}
                />
              ))}
            </Card>
          </View>
        </>
      ) : (
        <EmptyState
          title="No tracked case"
          description="Add a receipt number and update statuses manually as USCIS notices arrive."
          actionLabel="Add receipt"
        />
      )}
    </Screen>
  );
}
