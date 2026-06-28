import type { ReactNode } from "react";
import { Text, View } from "react-native";
import type { KeyboardTypeOptions } from "react-native";
import { Description, Input, Label, TextField } from "heroui-native";

import { SelectionCard } from "@/features/ui/selection-card";
import { colors, fonts } from "@/features/ui/tokens";

interface LabeledInputProps {
  label: string;
  value?: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  help?: string;
  optional?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  autoCorrect?: boolean;
  maxLength?: number;
  testID?: string;
}

/** A single labeled text field consistent with the glass design system. */
export function LabeledInput({
  label,
  value,
  onChangeText,
  placeholder,
  help,
  optional,
  keyboardType,
  autoCapitalize = "words",
  autoCorrect = false,
  maxLength,
  testID,
}: LabeledInputProps) {
  return (
    <TextField>
      <Label>
        {label}
        {optional ? <Text style={{ color: colors.hint }}> · optional</Text> : null}
      </Label>
      <Input
        accessibilityLabel={label}
        autoCapitalize={autoCapitalize}
        autoCorrect={autoCorrect}
        keyboardType={keyboardType}
        maxLength={maxLength}
        onChangeText={onChangeText}
        placeholder={placeholder}
        testID={testID}
        value={value ?? ""}
      />
      {help ? <Description>{help}</Description> : null}
    </TextField>
  );
}

/** Insert slashes as the user types digits → MM/DD/YYYY. */
export function maskUsDate(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  const mm = digits.slice(0, 2);
  const dd = digits.slice(2, 4);
  const yyyy = digits.slice(4, 8);
  let out = mm;
  if (digits.length > 2) out += `/${dd}`;
  if (digits.length > 4) out += `/${yyyy}`;
  return out;
}

interface DateInputProps {
  label: string;
  value?: string;
  onChangeText: (value: string) => void;
  help?: string;
  optional?: boolean;
  testID?: string;
}

/** MM/DD/YYYY date entry with live slash formatting and a numeric keypad. */
export function DateInput({ label, value, onChangeText, help, optional, testID }: DateInputProps) {
  return (
    <LabeledInput
      label={label}
      value={value}
      onChangeText={(next) => onChangeText(maskUsDate(next))}
      placeholder="MM/DD/YYYY"
      help={help}
      optional={optional}
      keyboardType="number-pad"
      autoCapitalize="none"
      maxLength={10}
      testID={testID}
    />
  );
}

export interface ChoiceOption<T extends string> {
  value: T;
  title: string;
  description?: string;
}

interface ChoiceGroupProps<T extends string> {
  options: readonly ChoiceOption<T>[];
  value?: T;
  onSelect: (value: T) => void;
  testIDPrefix?: string;
}

/** Vertical single-select list rendered as radio selection cards. */
export function ChoiceGroup<T extends string>({
  options,
  value,
  onSelect,
  testIDPrefix,
}: ChoiceGroupProps<T>) {
  return (
    <View style={{ gap: 10 }}>
      {options.map((option) => (
        <SelectionCard
          key={option.value}
          title={option.title}
          description={option.description}
          selected={value === option.value}
          controlRole="radio"
          testID={testIDPrefix ? `${testIDPrefix}-${option.value}` : undefined}
          onPress={() => onSelect(option.value)}
        />
      ))}
    </View>
  );
}

interface YesNoFieldProps {
  label: string;
  value?: boolean;
  onChange: (value: boolean) => void;
  yesLabel?: string;
  noLabel?: string;
  help?: string;
  testID?: string;
}

/** A labeled Yes/No segmented control for the form's boolean items. */
export function YesNoField({
  label,
  value,
  onChange,
  yesLabel = "Yes",
  noLabel = "No",
  help,
  testID,
}: YesNoFieldProps) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ color: colors.foreground, fontFamily: fonts.medium, fontSize: 14 }}>
        {label}
      </Text>
      <View style={{ flexDirection: "row", gap: 10 }}>
        {[
          { on: true, text: yesLabel },
          { on: false, text: noLabel },
        ].map((option) => {
          const selected = value === option.on;
          return (
            <View key={String(option.on)} style={{ flex: 1 }}>
              <SelectionCard
                title={option.text}
                selected={selected}
                controlRole="radio"
                testID={testID ? `${testID}-${option.on ? "yes" : "no"}` : undefined}
                onPress={() => onChange(option.on)}
              />
            </View>
          );
        })}
      </View>
      {help ? (
        <Text style={{ color: colors.hint, fontFamily: fonts.body, fontSize: 12 }}>{help}</Text>
      ) : null}
    </View>
  );
}

/** Amber callout for steps that touch legal judgment (UPL guardrail). */
export function LegalNotice({ children }: { children?: ReactNode }) {
  return (
    <View
      accessibilityRole="alert"
      style={{
        backgroundColor: "rgba(166,90,11,0.10)",
        borderColor: "rgba(166,90,11,0.25)",
        borderCurve: "continuous",
        borderRadius: 14,
        borderWidth: 1,
        gap: 3,
        padding: 12,
      }}
    >
      <Text style={{ color: colors.warning, fontFamily: fonts.semibold, fontSize: 13 }}>
        You decide this — the app doesn&apos;t
      </Text>
      <Text style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 12, lineHeight: 18 }}>
        {children ??
          "This step can involve legal judgment. The app helps you fill it in; it never decides your answer or gives legal advice."}
      </Text>
    </View>
  );
}
