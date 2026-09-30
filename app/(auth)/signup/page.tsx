import { Suspense } from "react";
import AuthForm from "@/components/auth/AuthForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create account",
  description: "Sign up for BuildMate AI and get 100 free credits.",
};

export default function SignupPage() {
  return (
    <Suspense>
      <AuthForm mode="signup" />
    </Suspense>
  );
}
