import { describe, expect, mock, test } from "bun:test";

mock.module("react-native", () => ({
  Text: "Text",
  View: "View",
}));

mock.module("heroui-native", () => ({
  Button: "Button",
  Card: "Card",
}));

const { WizardScaffold } = await import("./wizard-scaffold.tsx");

function getChildren(element) {
  const children = element?.props?.children;

  if (!children) {
    return [];
  }

  return Array.isArray(children) ? children : [children];
}

function findByAccessibilityRole(element, role) {
  if (!element || typeof element !== "object") {
    return undefined;
  }

  if (element.props?.accessibilityRole === role) {
    return element;
  }

  for (const child of getChildren(element)) {
    const match = findByAccessibilityRole(child, role);

    if (match) {
      return match;
    }
  }

  return undefined;
}

function findByTestID(element, testID) {
  if (!element || typeof element !== "object") {
    return undefined;
  }

  if (element.props?.testID === testID) {
    return element;
  }

  for (const child of getChildren(element)) {
    const match = findByTestID(child, testID);

    if (match) {
      return match;
    }
  }

  return undefined;
}

describe("WizardScaffold accessibility", () => {
  test("exposes progress with a readable label and numeric value", () => {
    const scaffold = WizardScaffold({
      eyebrow: "Step 3 of 10",
      title: "Confirm your mailing address",
      description: "One grouped address screen keeps the form readable.",
      stepIndex: 2,
      stepCount: 10,
      savedLabel: "Autosaved locally",
      canContinue: true,
      backTestID: "filing-wizard-back",
      continueTestID: "filing-wizard-continue",
      children: null,
    });

    const progress = findByAccessibilityRole(scaffold, "progressbar");

    expect(progress?.props.accessibilityLabel).toBe("Wizard progress: step 3 of 10");
    expect(progress?.props.accessibilityValue).toEqual({ min: 0, max: 10, now: 3 });
    expect(findByTestID(scaffold, "filing-wizard-back")).toBeDefined();
    expect(findByTestID(scaffold, "filing-wizard-continue")).toBeDefined();
  });
});
