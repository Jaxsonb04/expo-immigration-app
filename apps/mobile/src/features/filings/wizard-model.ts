import {
  getI765CanContinue,
  getI765CompletionPercent,
  getI765Step,
  i765WizardSteps,
  type I765DraftAnswers,
  type I765WizardStep,
  type I765WizardStepId,
} from "@immigration/shared";

export type WizardStep = I765WizardStep;

export const wizardSteps = i765WizardSteps;

export function getWizardStep(index: number): WizardStep {
  return getI765Step(index);
}

export function getWizardCanContinue(
  stepId: I765WizardStepId | string,
  answers: I765DraftAnswers
): boolean {
  return getI765CanContinue(stepId, answers);
}

export function getWizardCompletionPercent(answers: I765DraftAnswers): number {
  return getI765CompletionPercent(answers);
}
