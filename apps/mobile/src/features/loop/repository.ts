import {
  applyI765DraftPatch,
  getI765CompletionPercent,
  type I765DraftPatchResult,
  type LoopSnapshot,
} from "@immigration/shared";

import { localLoopSnapshot } from "./local-data";

export interface SaveI765DraftPatchInput {
  patch: Record<string, unknown>;
  currentStep: number;
  savedAt: string;
}

export interface LoopRepository {
  getSnapshot: () => LoopSnapshot;
  saveI765DraftPatch: (input: SaveI765DraftPatchInput) => I765DraftPatchResult;
}

function getBoundedCurrentStep(currentStep: number, totalSteps: number, fallbackStep: number): number {
  if (!Number.isFinite(currentStep)) {
    return fallbackStep;
  }

  return Math.max(0, Math.min(Math.trunc(currentStep), totalSteps));
}

export const localLoopRepository: LoopRepository = {
  getSnapshot: () => localLoopSnapshot,
  saveI765DraftPatch: ({ patch, currentStep, savedAt }) => {
    const activeApplication = localLoopSnapshot.activeApplication;

    if (!activeApplication || activeApplication.typeCode !== "I-765") {
      return {
        answers: {},
        acceptedKeys: [],
        rejectedKeys: Object.keys(patch),
      };
    }

    const result = applyI765DraftPatch(activeApplication.answers ?? {}, patch);

    if (result.acceptedKeys.length === 0) {
      return result;
    }

    const totalSteps = activeApplication.totalSteps;
    const boundedCurrentStep = getBoundedCurrentStep(currentStep, totalSteps, activeApplication.currentStep);
    const savedCurrentStep = Math.max(activeApplication.currentStep, boundedCurrentStep);
    const updatedApplication = {
      ...activeApplication,
      answers: result.answers,
      currentStep: savedCurrentStep,
      completionPercent: getI765CompletionPercent(result.answers),
      updatedAt: savedAt,
    };

    localLoopSnapshot.activeApplication = updatedApplication;
    localLoopSnapshot.applications = (localLoopSnapshot.applications ?? []).map((application) =>
      application.id === updatedApplication.id ? updatedApplication : application,
    );

    return result;
  },
};
