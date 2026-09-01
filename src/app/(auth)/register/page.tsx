import Link from "next/link";
import type { Metadata } from "next";

import { AuthCard, RegisterForm } from "@/features/auth/components";
import { ROUTES } from "@/constants/routes";

export const metadata: Metadata = { title: "Create account" };

export default function RegisterPage() {
  return (
    <AuthCard
      title="Create your account"
      description="Get access to premium digital subscriptions."
      footer={
        <>
          Already have an account?{" "}
          <Link href={ROUTES.login} className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <RegisterForm />
    </AuthCard>
  );
}
