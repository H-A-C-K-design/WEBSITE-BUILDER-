// ─── User ─────────────────────────────────────────────────────────────────────
export type Plan = "free" | "student" | "pro" | "team";

export interface UserDoc {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string | null;
  plan: Plan;
  planExpiresAt: Date | null;
  credits: number;
  creditsUsedThisMonth: number;
  downloadsThisMonth: number;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Projects ─────────────────────────────────────────────────────────────────
export type ProjectMode = "webpage" | "prototype" | "student";
export type ProjectFramework = "html" | "react";

export interface ProjectFile {
  path: string;
  content: string;
}

export interface Project {
  id: string;
  ownerId: string;
  name: string;
  description: string;
  mode: ProjectMode;
  framework: ProjectFramework;
  files: Record<string, string>; // path → content
  thumbnailUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectVersion {
  id: string;
  projectId: string;
  files: Record<string, string>;
  prompt: string;
  createdAt: Date;
  creditsSpent: number;
}

// ─── Credits ──────────────────────────────────────────────────────────────────
export type CreditReason =
  | "signup_bonus"
  | "generate"
  | "refine"
  | "refund"
  | "purchase"
  | "plan_upgrade";

export interface CreditLedgerEntry {
  id: string;
  uid: string;
  delta: number; // positive = credit added, negative = deducted
  reason: CreditReason;
  projectId?: string;
  paymentId?: string;
  createdAt: Date;
}

// ─── Payments ─────────────────────────────────────────────────────────────────
export type PlanOrPack =
  | "student_monthly"
  | "pro_monthly"
  | "team_monthly"
  | "pack_100"
  | "pack_300"
  | "pack_1000";

export interface Payment {
  id: string;
  uid: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  amountPaise: number;
  currency: "INR";
  planOrPack: PlanOrPack;
  status: "pending" | "success" | "failed";
  createdAt: Date;
}

// ─── Gemini Output ────────────────────────────────────────────────────────────
export interface GeminiGeneratedProject {
  projectName: string;
  summary: string;
  files: ProjectFile[];
}

// ─── API Responses ────────────────────────────────────────────────────────────
export interface ApiOk<T> {
  ok: true;
  data: T;
}

export interface ApiErr {
  ok: false;
  error: string;
  code?: string;
}

export type ApiResult<T> = ApiOk<T> | ApiErr;

// ─── Plan Definitions ─────────────────────────────────────────────────────────
export interface PlanDefinition {
  id: Plan;
  name: string;
  priceMonthly: number; // in paise (INR × 100)
  creditsPerMonth: number;
  features: string[];
  downloadLimit: number | null; // null = unlimited
  hasWatermark: boolean;
  canUseProModel: boolean;
  canUsePrototype: boolean;
  canUseReactExport: boolean;
  canSeeVersionHistory: boolean;
}

export interface CreditPack {
  id: PlanOrPack;
  credits: number;
  pricePaise: number;
  label: string;
}
