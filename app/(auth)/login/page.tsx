import { Suspense } from "react";
import AuthForm from "@/components/auth/AuthForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your BuildMate AI account.",
};

export default function LoginPage() {
  return (
    <Suspense>
      <AuthForm mode="login" />
    </Suspense>
  );
}
