import { useMemo, useState } from "react";
import { Text, View } from "react-native";
import {
  getI765CategoryByCode,
  I765_CATEGORY_CATALOG,
  I765_CATEGORY_GROUP_LABELS,
  type I765CategoryGroup,
  type I765CategoryInfo,
} from "@immigration/shared";

import { SelectionCard } from "@/features/ui/selection-card";
import { colors, fonts } from "@/features/ui/tokens";
import { LabeledInput } from "./wizard-fields";

interface EligibilityPickerProps {
  value?: string;
  onSelect: (code: string) => void;
}

const GROUP_ORDER: readonly I765CategoryGroup[] = [
  "student",
  "asylum-protection",
  "adjustment",
  "family-employment",
  "humanitarian",
];

function groupCategories(): Map<I765CategoryGroup, I765CategoryInfo[]> {
  const map = new Map<I765CategoryGroup, I765CategoryInfo[]>();
  for (const category of I765_CATEGORY_CATALOG) {
    const list = map.get(category.group) ?? [];
    list.push(category);
    map.set(category.group, list);
  }
  return map;
}

/**
 * Grouped, plain-English picker for Item 27. The category is the highest-risk
 * field on the form, so we present recognizable labels (never auto-detect) and
 * always allow entering a code manually for categories not in the common set.
 */
export function EligibilityPicker({ value, onSelect }: EligibilityPickerProps) {
  const grouped = useMemo(() => groupCategories(), []);
  const known = getI765CategoryByCode(value);
  const [manual, setManual] = useState(Boolean(value) && !known);

  return (
    <View style={{ gap: 18 }}>
      {value ? (
        <View
          style={{
            backgroundColor: colors.accentSoft,
            borderColor: colors.accent,
            borderCurve: "continuous",
            borderRadius: 14,
            borderWidth: 1.5,
            padding: 12,
          }}
        >
          <Text style={{ color: colors.foreground, fontFamily: fonts.semibold, fontSize: 15 }}>
            Selected: {value}
          </Text>
          <Text style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 13 }}>
            {known ? known.label : "Manually entered code"}
          </Text>
        </View>
      ) : null}

      {manual ? (
        <View style={{ gap: 10 }}>
          <LabeledInput
            label="Eligibility category code"
            value={value}
            onChangeText={(next) => onSelect(next.trim())}
            placeholder="(c)(3)(B)"
            autoCapitalize="none"
            help="Enter exactly as shown in the USCIS instructions, e.g. (c)(8) or (c)(3)(B)."
            testID="filing-eligibility-manual"
          />
          <Text
            onPress={() => setManual(false)}
            accessibilityRole="button"
            style={{ color: colors.accent, fontFamily: fonts.medium, fontSize: 13 }}
          >
            ← Choose from the common categories instead
          </Text>
        </View>
      ) : (
        <View style={{ gap: 18 }}>
          {GROUP_ORDER.map((group) => {
            const categories = grouped.get(group) ?? [];
            if (categories.length === 0) return null;
            return (
              <View key={group} style={{ gap: 10 }}>
                <Text
                  style={{
                    color: colors.muted,
                    fontFamily: fonts.semibold,
                    fontSize: 12,
                    letterSpacing: 0.4,
                    textTransform: "uppercase",
                  }}
                >
                  {I765_CATEGORY_GROUP_LABELS[group]}
                </Text>
                {categories.map((category) => (
                  <SelectionCard
                    key={category.id}
                    title={`${category.code} — ${category.label}`}
                    description={category.description}
                    selected={value === category.code}
                    controlRole="radio"
                    testID={`filing-eligibility-${category.id}`}
                    onPress={() => onSelect(category.code)}
                  />
                ))}
              </View>
            );
          })}
          <Text
            onPress={() => setManual(true)}
            accessibilityRole="button"
            testID="filing-eligibility-manual-toggle"
            style={{ color: colors.accent, fontFamily: fonts.medium, fontSize: 14 }}
          >
            My category isn&apos;t listed — enter the code manually →
          </Text>
        </View>
      )}
    </View>
  );
}
