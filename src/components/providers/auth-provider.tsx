"use client";

import { createContext, useEffect, useState, type PropsWithChildren } from "react";
import { usePathname } from "next/navigation";
import type { Session, User } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/client";

export type AuthContextValue = {
  user: User | null;
  session: Session | null;
  /** True until the initial `getSession()` call resolves. */
  isLoading: boolean;
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Client-side auth state for the whole app — one Supabase subscription
 * shared through context, rather than every consumer opening its own.
 * Mounted once in `components/providers/index.tsx`; read it via `useAuth`
 * (`src/hooks/use-auth.ts`).
 *
 * This is for client-side *UI* state (show an avatar vs. a "Sign in"
 * button, etc.) — it never gates access to anything. Route protection is
 * enforced server-side: `src/middleware.ts` + `requireUser`/`requireAdmin`
 * in `src/lib/auth/session.ts`.
 */
export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  // `loginAction`/`registerAction`/`logoutAction` sign in/out through the server-side Supabase
  // client (so the session cookie is set correctly for SSR) and then call `redirect()` — which
  // Next.js resolves as a client-side transition, not a full page load. This browser client's
  // `onAuthStateChange` above only fires for sign-ins/outs performed *through this same browser
  // client instance*, so a server-side sign-in never reaches it, and the navbar was found (in
  // manual testing) to keep showing "Login" right after a successful login until something else
  // triggered a re-check. Re-fetching on every pathname change is what reliably catches that up —
  // confirmed live: without this, the account menu doesn't appear until a manual refresh.
  useEffect(() => {
    createClient()
      .auth.getSession()
      .then(({ data }) => setSession(data.session));
  }, [pathname]);

  return (
    <AuthContext.Provider value={{ user: session?.user ?? null, session, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}
