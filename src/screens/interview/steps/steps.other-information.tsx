import { withForm } from "@/components/form";
import { Typography } from "heroui-native";
import { View } from "react-native";
import {
  fieldValidators,
  genderOptions,
  maritalStatusOptions,
  yesNoOptions,
} from "../interview.form";
import { stepBodyOptions } from "./steps.options";

/** I-765 only: Part 2 Other Information (Items 10-12). */
export const OtherInformationStep = withForm({
  ...stepBodyOptions,
  render: function Render({ form }) {
    return (
      <View className="gap-card">
        <form.AppField
          name="personFacts.gender"
          validators={{
            onBlur: fieldValidators.gender,
            onSubmit: fieldValidators.gender,
          }}
        >
          {(field) => (
            <field.RadioGroupField
              label="Sex"
              description="The official form offers these two options."
              options={[...genderOptions]}
              isRequired
            />
          )}
        </form.AppField>
        <form.AppField
          name="personFacts.maritalStatus"
          validators={{
            onBlur: fieldValidators.requiredChoice,
            onSubmit: fieldValidators.requiredChoice,
          }}
        >
          {(field) => (
            <field.RadioGroupField
              label="Marital status"
              options={[...maritalStatusOptions]}
              isRequired
            />
          )}
        </form.AppField>
        <form.AppField
          name="form.previouslyFiledI765"
          validators={{
            onBlur: fieldValidators.requiredChoice,
            onSubmit: fieldValidators.requiredChoice,
          }}
        >
          {(field) => (
            <field.RadioGroupField
              label="Have you previously filed Form I-765?"
              description="Any earlier work-permit application, whether or not it was approved."
              options={[...yesNoOptions]}
              isRequired
            />
          )}
        </form.AppField>
        {/* Honest disclosure of the one box we deliberately leave blank. */}
        <Typography.Paragraph color="muted" className="text-xs leading-relaxed">
          The form also has an optional Social Security number box. This app
          leaves it blank and does not ask for your SSN. If you want the Social
          Security Administration to issue you a card, fill that short section
          in yourself on the printed form.
        </Typography.Paragraph>
      </View>
    );
  },
});
