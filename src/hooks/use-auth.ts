"use client";

import { useContext } from "react";

import { AuthContext } from "@/components/providers/auth-provider";

/**
 * Client-side auth state — `{ user, session, isLoading }` — backed by
 * `AuthProvider` (mounted app-wide in `components/providers`). For Server
 * Components, use `getCurrentUser`/`requireUser`/`requireAdmin` from
 * `@/lib/auth/session` instead — this hook has no server-side equivalent
 * and doesn't gate access to anything by itself.
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
