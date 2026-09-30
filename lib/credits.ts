import type { ProjectMode, ProjectFramework } from "@/types";

// Credit costs for each action
export const CREDIT_COSTS = {
  generate_webpage_fast: 10,
  generate_webpage_pro: 25,
  generate_prototype: 20,
  generate_student: 10,
  refine: 3,
  download: 0,
} as const;

export type CreditAction = keyof typeof CREDIT_COSTS;

/** Returns the credit cost for a given generation config */
export function getGenerateCost(
  mode: ProjectMode,
  useProModel: boolean
): number {
  if (mode === "prototype") return CREDIT_COSTS.generate_prototype;
  if (useProModel) return CREDIT_COSTS.generate_webpage_pro;
  if (mode === "student") return CREDIT_COSTS.generate_student;
  return CREDIT_COSTS.generate_webpage_fast;
}

/** Label shown on the Generate button */
export function generateButtonLabel(
  mode: ProjectMode,
  useProModel: boolean
): string {
  const cost = getGenerateCost(mode, useProModel);
  return `Generate — ${cost} credits`;
}

/** Unit tests live in __tests__/credits.test.ts */
export const SIGNUP_BONUS = 100;
export const FREE_DOWNLOAD_LIMIT = 3;
