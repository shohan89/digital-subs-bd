import Link from "next/link";
import type { Metadata } from "next";

import { AuthCard, ForgotPasswordForm } from "@/features/auth/components";
import { ROUTES } from "@/constants/routes";

export const metadata: Metadata = { title: "Reset your password" };

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Reset your password"
      description="Enter your email and we'll send you a reset link."
      footer={
        <>
          Remembered it?{" "}
          <Link href={ROUTES.login} className="font-medium text-primary hover:underline">
            Back to sign in
          </Link>
        </>
      }
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
