import { describe, expect, mock, test } from "bun:test";

mock.module("react-native", () => ({
  Pressable: "Pressable",
  Text: "Text",
  View: "View",
}));

const { SelectionCard } = await import("./selection-card.tsx");

describe("SelectionCard accessibility", () => {
  test("exposes radio choices with checked state", () => {
    const card = SelectionCard({
      title: "Renewal",
      description: "You are renewing an existing EAD.",
      selected: true,
      controlRole: "radio",
      testID: "filing-reason-renewal",
    });

    expect(card.props.accessibilityRole).toBe("radio");
    expect(card.props.accessibilityState).toEqual({ checked: true });
    expect(card.props.accessibilityLabel).toBe("Renewal");
    expect(card.props.testID).toBe("filing-reason-renewal");
  });

  test("exposes checkbox choices with checked state", () => {
    const card = SelectionCard({
      title: "I reviewed and verified my answers",
      selected: false,
      controlRole: "checkbox",
    });

    expect(card.props.accessibilityRole).toBe("checkbox");
    expect(card.props.accessibilityState).toEqual({ checked: false });
  });

  test("keeps generic button semantics for non-choice cards", () => {
    const card = SelectionCard({
      title: "Open details",
      selected: true,
    });

    expect(card.props.accessibilityRole).toBe("button");
    expect(card.props.accessibilityState).toEqual({ selected: true });
  });
});
