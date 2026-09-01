import Link from "next/link";
import type { Metadata } from "next";

import { AuthCard, LoginForm } from "@/features/auth/components";
import { ROUTES } from "@/constants/routes";

export const metadata: Metadata = { title: "Sign in" };

type LoginPageProps = {
  searchParams: Promise<{ redirectTo?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { redirectTo } = await searchParams;

  return (
    <AuthCard
      title="Welcome back"
      description="Sign in to manage your subscriptions."
      footer={
        <>
          Don&apos;t have an account?{" "}
          <Link href={ROUTES.register} className="font-medium text-primary hover:underline">
            Create one
          </Link>
        </>
      }
    >
      <LoginForm redirectTo={redirectTo} />
    </AuthCard>
  );
}
