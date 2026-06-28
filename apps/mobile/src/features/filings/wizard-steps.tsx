import { Text, View } from "react-native";
import {
  getI765CategoryByCode,
  getI765DocumentChecklist,
  getI765MissingCoreFields,
  I765_REASON_OPTIONS,
  validateI765Answers,
  type I765Address,
  type I765FullAnswers,
  type I765MaritalStatus,
  type I765Sex,
} from "@immigration/shared";

import { SelectionCard } from "@/features/ui/selection-card";
import { colors, fonts } from "@/features/ui/tokens";
import type { I765DraftController } from "./draft-store";
import { EligibilityPicker } from "./eligibility-picker";
import { ChoiceGroup, DateInput, LabeledInput, LegalNotice, YesNoField } from "./wizard-fields";

export type WizardStepId =
  | "reason"
  | "name"
  | "mailing"
  | "physical"
  | "otherInfo"
  | "citizenship"
  | "arrival"
  | "eligibility"
  | "documents"
  | "contact"
  | "review"
  | "export";

export interface WizardStepMeta {
  id: WizardStepId;
  eyebrow: string;
  title: string;
  description: string;
  legal?: boolean;
  continueLabel?: string;
}

export const WIZARD_STEPS: readonly WizardStepMeta[] = [
  {
    id: "reason",
    eyebrow: "Part 1 · Reason",
    title: "Why are you applying?",
    description: "Choose the reason that matches your situation. It affects your fee and filing.",
    legal: true,
  },
  {
    id: "name",
    eyebrow: "Part 2 · Your name",
    title: "Your full legal name",
    description: "Enter your name exactly as it appears on your identity documents.",
  },
  {
    id: "mailing",
    eyebrow: "Part 2 · Address",
    title: "Your U.S. mailing address",
    description: "USCIS mails your work permit here. Use an address where you reliably get mail.",
  },
  {
    id: "physical",
    eyebrow: "Part 2 · Address",
    title: "Where do you physically live?",
    description: "If your physical address differs from your mailing address, add it here.",
  },
  {
    id: "otherInfo",
    eyebrow: "Part 2 · About you",
    title: "A few details about you",
    description: "These come straight from your records. Leave anything you don't have blank.",
  },
  {
    id: "citizenship",
    eyebrow: "Part 2 · Origin",
    title: "Citizenship & birth",
    description: "List your citizenship, where you were born, and your date of birth.",
  },
  {
    id: "arrival",
    eyebrow: "Part 2 · Arrival & status",
    title: "Your arrival and status",
    description: "From your passport, I-94, and immigration records. Skip what doesn't apply.",
    legal: true,
  },
  {
    id: "eligibility",
    eyebrow: "Part 2 · Item 27",
    title: "Your eligibility category",
    description: "This is the most important box on the form. Pick the category you qualify under.",
    legal: true,
  },
  {
    id: "documents",
    eyebrow: "Checklist",
    title: "Documents to gather",
    description: "Based on your category, here's what to include with your filing.",
  },
  {
    id: "contact",
    eyebrow: "Part 3 · Statement",
    title: "Contact & statement",
    description: "How USCIS can reach you, plus the interpreter/preparer declaration.",
  },
  {
    id: "review",
    eyebrow: "Review",
    title: "Review and verify",
    description: "You are responsible for verifying every answer before creating the PDF.",
    legal: true,
  },
  {
    id: "export",
    eyebrow: "Export",
    title: "Create your I-765 PDF",
    description: "Generate a filled, signature-ready PDF you can preview, print, and save.",
    continueLabel: "Create PDF",
  },
];

export const WIZARD_STEP_COUNT = WIZARD_STEPS.length;

/** Gate which steps require an answer before the user can continue. */
export function getStepCanContinue(stepId: WizardStepId, answers: I765FullAnswers): boolean {
  switch (stepId) {
    case "reason":
      return Boolean(answers.reason);
    case "name":
      return Boolean(answers.familyName?.trim() && answers.givenName?.trim());
    case "eligibility":
      return Boolean(answers.eligibilityCode?.trim());
    case "review":
      return answers.reviewAcknowledged === true;
    default:
      return true;
  }
}

const SEX_OPTIONS: readonly { value: I765Sex; title: string }[] = [
  { value: "female", title: "Female" },
  { value: "male", title: "Male" },
];

const MARITAL_OPTIONS: readonly { value: I765MaritalStatus; title: string }[] = [
  { value: "single", title: "Single" },
  { value: "married", title: "Married" },
  { value: "divorced", title: "Divorced" },
  { value: "widowed", title: "Widowed" },
];

const UNIT_OPTIONS = [
  { value: "apt", title: "Apt" },
  { value: "ste", title: "Ste" },
  { value: "flr", title: "Flr" },
] as const;

function FieldGroupLabel({ children }: { children: string }) {
  return (
    <Text
      style={{
        color: colors.muted,
        fontFamily: fonts.semibold,
        fontSize: 12,
        letterSpacing: 0.4,
        marginTop: 4,
        textTransform: "uppercase",
      }}
    >
      {children}
    </Text>
  );
}

interface AddressFieldsProps {
  address?: I765Address;
  onChange: (partial: Partial<I765Address>) => void;
  withInCareOf?: boolean;
  testIDPrefix: string;
}

function AddressFields({ address, onChange, withInCareOf, testIDPrefix }: AddressFieldsProps) {
  return (
    <View style={{ gap: 14 }}>
      {withInCareOf ? (
        <LabeledInput
          label="In care of name"
          value={address?.inCareOf}
          onChangeText={(v) => onChange({ inCareOf: v })}
          optional
          testID={`${testIDPrefix}-care-of`}
        />
      ) : null}
      <LabeledInput
        label="Street number and name"
        value={address?.street}
        onChangeText={(v) => onChange({ street: v })}
        placeholder="123 Main St"
        testID={`${testIDPrefix}-street`}
      />
      <View style={{ gap: 8 }}>
        <Text style={{ color: colors.foreground, fontFamily: fonts.medium, fontSize: 14 }}>
          Apartment, suite, or floor <Text style={{ color: colors.hint }}>· optional</Text>
        </Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {UNIT_OPTIONS.map((unit) => (
            <View key={unit.value} style={{ flex: 1 }}>
              <SelectionCard
                title={unit.title}
                selected={address?.unitType === unit.value}
                controlRole="radio"
                onPress={() =>
                  onChange({ unitType: address?.unitType === unit.value ? undefined : unit.value })
                }
              />
            </View>
          ))}
        </View>
        {address?.unitType ? (
          <LabeledInput
            label="Unit number"
            value={address?.unitNumber}
            onChangeText={(v) => onChange({ unitNumber: v })}
            placeholder="4B"
            testID={`${testIDPrefix}-unit`}
          />
        ) : null}
      </View>
      <LabeledInput
        label="City or town"
        value={address?.city}
        onChangeText={(v) => onChange({ city: v })}
        testID={`${testIDPrefix}-city`}
      />
      <View style={{ flexDirection: "row", gap: 12 }}>
        <View style={{ flex: 1 }}>
          <LabeledInput
            label="State"
            value={address?.state}
            onChangeText={(v) => onChange({ state: v.toUpperCase().slice(0, 2) })}
            placeholder="TX"
            help="2-letter code"
            autoCapitalize="characters"
            maxLength={2}
            testID={`${testIDPrefix}-state`}
          />
        </View>
        <View style={{ flex: 1 }}>
          <LabeledInput
            label="ZIP code"
            value={address?.zip}
            onChangeText={(v) => onChange({ zip: v.replace(/[^0-9-]/g, "").slice(0, 10) })}
            placeholder="78701"
            keyboardType="number-pad"
            autoCapitalize="none"
            testID={`${testIDPrefix}-zip`}
          />
        </View>
      </View>
    </View>
  );
}

interface StepBodyProps {
  stepId: WizardStepId;
  draft: I765DraftController;
  /** Patch the legacy non-PII loop draft so Home's progress card stays in sync. */
  onExecutableChoice: (patch: Record<string, unknown>) => void;
}

/** Renders the interactive body for the current wizard step. */
export function StepBody({ stepId, draft, onExecutableChoice }: StepBodyProps) {
  const { answers, patch, update, patchAddress } = draft;

  switch (stepId) {
    case "reason":
      return (
        <View style={{ gap: 14 }}>
          <LegalNotice>
            Renewal vs. initial vs. replacement changes your fee and timing. Choose the one that
            matches your situation — the app won&apos;t choose for you.
          </LegalNotice>
          <ChoiceGroup
            options={I765_REASON_OPTIONS}
            value={answers.reason}
            onSelect={(reason) => {
              patch({ reason });
              onExecutableChoice({ reason });
            }}
            testIDPrefix="filing-reason"
          />
        </View>
      );

    case "name":
      return (
        <View style={{ gap: 14 }}>
          <LabeledInput
            label="Family name (last name)"
            value={answers.familyName}
            onChangeText={(v) => patch({ familyName: v })}
            testID="filing-family-name"
          />
          <LabeledInput
            label="Given name (first name)"
            value={answers.givenName}
            onChangeText={(v) => patch({ givenName: v })}
            testID="filing-given-name"
          />
          <LabeledInput
            label="Middle name"
            value={answers.middleName}
            onChangeText={(v) => patch({ middleName: v })}
            optional
            testID="filing-middle-name"
          />
          <FieldGroupLabel>Other names you&apos;ve used (optional)</FieldGroupLabel>
          <LabeledInput
            label="Other family name"
            value={answers.otherNames?.[0]?.familyName}
            onChangeText={(v) =>
              update((prev) => ({ otherNames: [{ ...prev.otherNames?.[0], familyName: v }] }))
            }
            optional
            help="Maiden name, aliases, nicknames. Need more space? Use Part 6 on the printed form."
          />
          <LabeledInput
            label="Other given name"
            value={answers.otherNames?.[0]?.givenName}
            onChangeText={(v) =>
              update((prev) => ({ otherNames: [{ ...prev.otherNames?.[0], givenName: v }] }))
            }
            optional
          />
        </View>
      );

    case "mailing":
      return (
        <AddressFields
          address={answers.mailingAddress}
          onChange={(partial) => patchAddress("mailingAddress", partial)}
          withInCareOf
          testIDPrefix="filing-mailing"
        />
      );

    case "physical":
      return (
        <View style={{ gap: 16 }}>
          <YesNoField
            label="Is your mailing address the same as your physical address?"
            value={answers.mailingSameAsPhysical}
            onChange={(value) => patch({ mailingSameAsPhysical: value })}
            testID="filing-same-address"
          />
          {answers.mailingSameAsPhysical === false ? (
            <AddressFields
              address={answers.physicalAddress}
              onChange={(partial) => patchAddress("physicalAddress", partial)}
              testIDPrefix="filing-physical"
            />
          ) : null}
        </View>
      );

    case "otherInfo":
      return (
        <View style={{ gap: 16 }}>
          <LabeledInput
            label="A-Number (Alien Registration Number)"
            value={answers.aNumber}
            onChangeText={(v) => patch({ aNumber: v })}
            optional
            placeholder="A123456789"
            autoCapitalize="characters"
            testID="filing-a-number"
          />
          <LabeledInput
            label="USCIS Online Account Number"
            value={answers.uscisOnlineAccountNumber}
            onChangeText={(v) => patch({ uscisOnlineAccountNumber: v })}
            optional
            keyboardType="number-pad"
            autoCapitalize="none"
          />
          <FieldGroupLabel>Sex</FieldGroupLabel>
          <ChoiceGroup
            options={SEX_OPTIONS}
            value={answers.sex}
            onSelect={(sex) => patch({ sex })}
            testIDPrefix="filing-sex"
          />
          <FieldGroupLabel>Marital status</FieldGroupLabel>
          <ChoiceGroup
            options={MARITAL_OPTIONS}
            value={answers.maritalStatus}
            onSelect={(maritalStatus) => patch({ maritalStatus })}
            testIDPrefix="filing-marital"
          />
          <YesNoField
            label="Have you previously filed Form I-765?"
            value={answers.previouslyFiledI765}
            onChange={(v) => patch({ previouslyFiledI765: v })}
            testID="filing-prior-i765"
          />
          <LabeledInput
            label="Social Security Number"
            value={answers.ssn}
            onChangeText={(v) => patch({ ssn: v })}
            optional
            placeholder="123-45-6789"
            keyboardType="number-pad"
            autoCapitalize="none"
            help="Only if you have one. Otherwise leave blank."
          />
        </View>
      );

    case "citizenship":
      return (
        <View style={{ gap: 16 }}>
          <FieldGroupLabel>Country(ies) of citizenship</FieldGroupLabel>
          <LabeledInput
            label="Country of citizenship"
            value={answers.countriesOfCitizenship?.[0]}
            onChangeText={(v) =>
              update((prev) => ({
                countriesOfCitizenship: [v, prev.countriesOfCitizenship?.[1] ?? ""].filter(Boolean),
              }))
            }
            testID="filing-citizenship-1"
          />
          <LabeledInput
            label="Second country of citizenship"
            value={answers.countriesOfCitizenship?.[1]}
            onChangeText={(v) =>
              update((prev) => ({
                countriesOfCitizenship: [prev.countriesOfCitizenship?.[0] ?? "", v].filter(Boolean),
              }))
            }
            optional
          />
          <FieldGroupLabel>Place of birth</FieldGroupLabel>
          <LabeledInput
            label="City / town / village of birth"
            value={answers.birthCity}
            onChangeText={(v) => patch({ birthCity: v })}
            testID="filing-birth-city"
          />
          <LabeledInput
            label="State / province of birth"
            value={answers.birthStateProvince}
            onChangeText={(v) => patch({ birthStateProvince: v })}
            optional
          />
          <LabeledInput
            label="Country of birth"
            value={answers.birthCountry}
            onChangeText={(v) => patch({ birthCountry: v })}
            testID="filing-birth-country"
          />
          <DateInput
            label="Date of birth"
            value={answers.dateOfBirth}
            onChangeText={(v) => patch({ dateOfBirth: v })}
            testID="filing-dob"
          />
        </View>
      );

    case "arrival":
      return (
        <View style={{ gap: 16 }}>
          <LegalNotice>
            Describing your immigration status can involve legal judgment. Enter what your documents
            show; if you&apos;re unsure, talk to a qualified immigration attorney.
          </LegalNotice>
          <LabeledInput
            label="Form I-94 number"
            value={answers.i94Number}
            onChangeText={(v) => patch({ i94Number: v })}
            optional
            keyboardType="number-pad"
            autoCapitalize="none"
          />
          <LabeledInput
            label="Passport number"
            value={answers.passportNumber}
            onChangeText={(v) => patch({ passportNumber: v })}
            optional
            autoCapitalize="characters"
          />
          <LabeledInput
            label="Country that issued your passport"
            value={answers.passportCountryOfIssuance}
            onChangeText={(v) => patch({ passportCountryOfIssuance: v })}
            optional
          />
          <DateInput
            label="Passport / travel document expiration"
            value={answers.passportExpDate}
            onChangeText={(v) => patch({ passportExpDate: v })}
            optional
          />
          <DateInput
            label="Date of last entry into the U.S."
            value={answers.dateOfLastEntry}
            onChangeText={(v) => patch({ dateOfLastEntry: v })}
            optional
          />
          <LabeledInput
            label="Place of last entry into the U.S."
            value={answers.placeOfLastEntry}
            onChangeText={(v) => patch({ placeOfLastEntry: v })}
            optional
            placeholder="Laredo, TX"
          />
          <LabeledInput
            label="Immigration status at last entry"
            value={answers.statusAtLastEntry}
            onChangeText={(v) => patch({ statusAtLastEntry: v })}
            optional
            placeholder="F-1 student"
          />
          <LabeledInput
            label="Current immigration status or category"
            value={answers.currentImmigrationStatus}
            onChangeText={(v) => patch({ currentImmigrationStatus: v })}
            optional
            placeholder="F-1 student"
          />
          <LabeledInput
            label="SEVIS number"
            value={answers.sevisNumber}
            onChangeText={(v) => patch({ sevisNumber: v })}
            optional
            autoCapitalize="characters"
            placeholder="N0001234567"
          />
        </View>
      );

    case "eligibility":
      return <EligibilityStep draft={draft} onExecutableChoice={onExecutableChoice} />;

    case "documents":
      return <DocumentsStep answers={answers} />;

    case "contact":
      return (
        <View style={{ gap: 16 }}>
          <LabeledInput
            label="Daytime phone number"
            value={answers.daytimePhone}
            onChangeText={(v) => patch({ daytimePhone: v })}
            optional
            keyboardType="phone-pad"
            autoCapitalize="none"
            testID="filing-phone"
          />
          <LabeledInput
            label="Mobile phone number"
            value={answers.mobilePhone}
            onChangeText={(v) => patch({ mobilePhone: v })}
            optional
            keyboardType="phone-pad"
            autoCapitalize="none"
          />
          <LabeledInput
            label="Email address"
            value={answers.email}
            onChangeText={(v) => patch({ email: v })}
            optional
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <YesNoField
            label="Can you read and understand English?"
            value={answers.readsEnglish}
            onChange={(value) => patch({ readsEnglish: value, usedInterpreter: !value })}
            help="If not, an interpreter must read the form to you and sign Part 4."
          />
          {answers.readsEnglish === false ? (
            <LabeledInput
              label="Language the interpreter used"
              value={answers.interpreter?.language}
              onChangeText={(v) =>
                update((prev) => ({ interpreter: { ...prev.interpreter, language: v } }))
              }
            />
          ) : null}
          <YesNoField
            label="Did someone else prepare this form for you?"
            value={answers.usedPreparer}
            onChange={(value) => patch({ usedPreparer: value })}
          />
          {answers.usedPreparer ? (
            <View style={{ gap: 14 }}>
              <LegalNotice>
                A &quot;preparer&quot; is a person who filled the form out for you. This app is a
                tool, not your preparer — only list a real person here.
              </LegalNotice>
              <LabeledInput
                label="Preparer family name"
                value={answers.preparer?.familyName}
                onChangeText={(v) =>
                  update((prev) => ({ preparer: { ...prev.preparer, familyName: v } }))
                }
              />
              <LabeledInput
                label="Preparer given name"
                value={answers.preparer?.givenName}
                onChangeText={(v) =>
                  update((prev) => ({ preparer: { ...prev.preparer, givenName: v } }))
                }
              />
            </View>
          ) : null}
        </View>
      );

    case "review":
      return <ReviewStep draft={draft} onExecutableChoice={onExecutableChoice} />;

    case "export":
      return (
        <Text style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 14, lineHeight: 21 }}>
          When you tap Create PDF, the app fills the official Form I-765 (edition 08/21/25) on your
          device and opens a preview. Nothing is sent to USCIS — you print, sign, and file it
          yourself.
        </Text>
      );

    default:
      return null;
  }
}

function EligibilityStep({ draft, onExecutableChoice }: Omit<StepBodyProps, "stepId">) {
  const { answers, patch } = draft;
  const category = getI765CategoryByCode(answers.eligibilityCode);

  return (
    <View style={{ gap: 16 }}>
      <LegalNotice>
        The wrong category is the #1 reason I-765s are denied. Pick the one you qualify under; if
        you&apos;re unsure, get advice from a qualified immigration attorney or accredited
        representative.
      </LegalNotice>
      <EligibilityPicker
        value={answers.eligibilityCode}
        onSelect={(code) => {
          patch({ eligibilityCode: code });
          const id = getI765CategoryByCode(code)?.id;
          if (id === "c8" || id === "c9" || id === "c33") {
            onExecutableChoice({ eligibilityCategory: id });
          }
        }}
      />
      {category?.conditionalItem === "item28" ? (
        <View style={{ gap: 14 }}>
          <FieldGroupLabel>STEM OPT details (Item 28)</FieldGroupLabel>
          <LabeledInput
            label="Degree"
            value={answers.stemDegree}
            onChangeText={(v) => patch({ stemDegree: v })}
            placeholder="MS Computer Science"
          />
          <LabeledInput
            label="Employer's name in E-Verify"
            value={answers.stemEmployerEverify}
            onChangeText={(v) => patch({ stemEmployerEverify: v })}
          />
          <LabeledInput
            label="Employer's E-Verify company ID"
            value={answers.stemEverifyId}
            onChangeText={(v) => patch({ stemEverifyId: v })}
            keyboardType="number-pad"
            autoCapitalize="none"
          />
        </View>
      ) : null}
      {category?.conditionalItem === "item29" ? (
        <LabeledInput
          label="H-1B spouse's I-797 receipt number (Item 29)"
          value={answers.h4ReceiptNumber}
          onChangeText={(v) => patch({ h4ReceiptNumber: v })}
          autoCapitalize="characters"
        />
      ) : null}
      {category?.conditionalItem === "item30" ? (
        <YesNoField
          label="Have you EVER been arrested for and/or convicted of any crime? (Item 30)"
          value={answers.c8EverArrested}
          onChange={(v) => patch({ c8EverArrested: v })}
        />
      ) : null}
      {category?.conditionalItem === "item31" ? (
        <View style={{ gap: 14 }}>
          <LabeledInput
            label="Form I-140 I-797 receipt number (Item 31.a)"
            value={answers.ebReceiptNumber}
            onChangeText={(v) => patch({ ebReceiptNumber: v })}
            autoCapitalize="characters"
          />
          <YesNoField
            label="Have you EVER been arrested for and/or convicted of any crime? (Item 31.b)"
            value={answers.ebEverArrested}
            onChange={(v) => patch({ ebEverArrested: v })}
          />
        </View>
      ) : null}
    </View>
  );
}

function DocumentsStep({ answers }: { answers: I765FullAnswers }) {
  const category = getI765CategoryByCode(answers.eligibilityCode);
  const checklist = getI765DocumentChecklist(category, answers.reason);
  return (
    <View style={{ gap: 12 }}>
      <Text style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 13, lineHeight: 19 }}>
        Gather these to file with your I-765{category ? ` (${category.code})` : ""}. The app keeps a
        checklist — it does not upload documents.
      </Text>
      {checklist.map((item) => (
        <View key={item} style={{ flexDirection: "row", gap: 10 }}>
          <Text style={{ color: colors.accent, fontFamily: fonts.bold, fontSize: 14 }}>•</Text>
          <Text
            style={{
              color: colors.foreground,
              fontFamily: fonts.body,
              fontSize: 14,
              flex: 1,
              lineHeight: 20,
            }}
          >
            {item}
          </Text>
        </View>
      ))}
    </View>
  );
}

const FIELD_LABELS: Record<string, string> = {
  reason: "Reason for applying",
  familyName: "Family name",
  givenName: "Given name",
  sex: "Sex",
  maritalStatus: "Marital status",
  countriesOfCitizenship: "Country of citizenship",
  birthCountry: "Country of birth",
  dateOfBirth: "Date of birth",
  eligibilityCode: "Eligibility category",
  mailingAddress: "Mailing address",
  physicalAddress: "Physical address",
};

function ReviewStep({ draft, onExecutableChoice }: Omit<StepBodyProps, "stepId">) {
  const { answers, patch } = draft;
  const missing = getI765MissingCoreFields(answers);
  const issues = validateI765Answers(answers);

  return (
    <View style={{ gap: 16 }}>
      {missing.length > 0 ? (
        <View style={{ gap: 8 }}>
          <Text style={{ color: colors.warning, fontFamily: fonts.semibold, fontSize: 14 }}>
            Still missing ({missing.length})
          </Text>
          {missing.map((key) => (
            <Text key={key} style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 13 }}>
              • {FIELD_LABELS[key] ?? key}
            </Text>
          ))}
        </View>
      ) : (
        <Text style={{ color: colors.success, fontFamily: fonts.semibold, fontSize: 14 }}>
          All required fields are filled in.
        </Text>
      )}

      {issues.length > 0 ? (
        <View style={{ gap: 8 }}>
          <Text style={{ color: colors.danger, fontFamily: fonts.semibold, fontSize: 14 }}>
            Check these formats
          </Text>
          {issues.map((issue) => (
            <Text
              key={issue.field}
              style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 13 }}
            >
              • {issue.message}
            </Text>
          ))}
        </View>
      ) : null}

      <SelectionCard
        title="I reviewed and verified all my answers"
        description="The PDF is yours to sign and file. Creating it does not submit anything to USCIS."
        selected={answers.reviewAcknowledged === true}
        controlRole="checkbox"
        testID="filing-review-ack"
        onPress={() => {
          const next = answers.reviewAcknowledged !== true;
          patch({ reviewAcknowledged: next });
          onExecutableChoice({ reviewAcknowledged: next });
        }}
      />
    </View>
  );
}
