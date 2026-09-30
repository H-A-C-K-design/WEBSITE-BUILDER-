import { Suspense } from "react";
import AuthForm from "@/components/auth/AuthForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reset password",
};

export default function ForgotPasswordPage() {
  return (
    <Suspense>
      <AuthForm mode="forgot" />
    </Suspense>
  );
}
