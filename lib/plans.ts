import type { PlanDefinition, CreditPack } from "@/types";

// Prices in paise (INR × 100)
export const PLANS: Record<string, PlanDefinition> = {
  free: {
    id: "free",
    name: "Free",
    priceMonthly: 0,
    creditsPerMonth: 0,
    features: [
      "100 one-time credits on signup",
      "Basic webpage generation",
      "Live preview",
      "3 downloads per month",
      "Community support",
    ],
    downloadLimit: 3,
    hasWatermark: true,
    canUseProModel: false,
    canUsePrototype: false,
    canUseReactExport: false,
    canSeeVersionHistory: false,
  },
  student: {
    id: "student",
    name: "Student",
    priceMonthly: 19900, // ₹199
    creditsPerMonth: 500,
    features: [
      "500 credits per month",
      "No watermark",
      "Unlimited downloads",
      "Prototype mode",
      "Version history (last 10)",
      "Student project mode with comments",
      "Email support",
    ],
    downloadLimit: null,
    hasWatermark: false,
    canUseProModel: false,
    canUsePrototype: true,
    canUseReactExport: false,
    canSeeVersionHistory: true,
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceMonthly: 49900, // ₹499
    creditsPerMonth: 1500,
    features: [
      "1,500 credits per month",
      "Everything in Student",
      "Gemini Pro model (higher quality)",
      "React / Vite project export",
      "Custom fonts and themes",
      "Priority generation speed",
      "Priority support",
    ],
    downloadLimit: null,
    hasWatermark: false,
    canUseProModel: true,
    canUsePrototype: true,
    canUseReactExport: true,
    canSeeVersionHistory: true,
  },
  team: {
    id: "team",
    name: "Team",
    priceMonthly: 99900, // ₹999
    creditsPerMonth: 4000,
    features: [
      "4,000 credits per month",
      "Everything in Pro",
      "Share projects with a link",
      "Custom domain export guide",
      "Team member invites (coming soon)",
      "Dedicated support",
    ],
    downloadLimit: null,
    hasWatermark: false,
    canUseProModel: true,
    canUsePrototype: true,
    canUseReactExport: true,
    canSeeVersionHistory: true,
  },
};

export const CREDIT_PACKS: CreditPack[] = [
  { id: "pack_100", credits: 100, pricePaise: 9900, label: "100 credits" },
  { id: "pack_300", credits: 300, pricePaise: 24900, label: "300 credits" },
  { id: "pack_1000", credits: 1000, pricePaise: 69900, label: "1000 credits" },
];

export const PLAN_ORDER: string[] = ["free", "student", "pro", "team"];

/** Returns true if planA is at least as good as planB */
export function planAtLeast(userPlan: string, requiredPlan: string): boolean {
  return PLAN_ORDER.indexOf(userPlan) >= PLAN_ORDER.indexOf(requiredPlan);
}

/** Format a paise amount as INR currency string */
export function formatINR(paise: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
  }).format(paise / 100);
}

/** Plan display monthly price */
export function planMonthlyLabel(plan: PlanDefinition): string {
  if (plan.priceMonthly === 0) return "Free";
  return `${formatINR(plan.priceMonthly)} / month`;
}
