import type { PropsWithChildren, ReactNode } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ROUTES } from "@/constants/routes";
import { siteConfig } from "@/constants/site";

type AuthCardProps = PropsWithChildren<{
  title: string;
  description: string;
  footer?: ReactNode;
}>;

/**
 * Shared shell for /login, /register, /forgot-password — brand mark, card, entrance animation.
 * A plain CSS entrance (`tw-animate-css`'s `animate-in`/`fade-in`/`slide-in-from-bottom-3`,
 * matching `lib/motion.ts`'s `fadeInUp` variant's opacity/12px-y/duration values) rather than
 * `framer-motion` — this was the *only* thing requiring `"use client"` here (no hooks, no
 * handlers), so this component now renders on the server; only its `children` (the actual
 * `LoginForm`/`RegisterForm`/etc.) still need to be client, for `react-hook-form`.
 */
export function AuthCard({ title, description, footer, children }: AuthCardProps) {
  return (
    <div className="w-full max-w-sm animate-in fade-in slide-in-from-bottom-3 duration-300">
      <Link
        href={ROUTES.home}
        className="mb-6 flex items-center justify-center gap-2 font-heading text-lg font-semibold"
      >
        <Sparkles className="size-5 text-primary" aria-hidden="true" />
        {siteConfig.name}
      </Link>

      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>

      {footer && <p className="mt-4 text-center text-sm text-muted-foreground">{footer}</p>}
    </div>
  );
}
