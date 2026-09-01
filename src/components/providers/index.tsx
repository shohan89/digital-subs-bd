import type { PropsWithChildren } from "react";

import { AuthProvider } from "@/components/providers/auth-provider";
import { CartProvider } from "@/components/providers/cart-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "@/components/ui/sonner";

/**
 * Root Providers — every app-wide client provider is composed here so `layout.tsx` stays a Server Component.
 * Defaults to dark: the brand's background (#020617) and secondary (#0F172A) tokens ARE the dark theme —
 * light is a supported, accessible alternative, not the primary experience.
 */
export function Providers({ children }: PropsWithChildren) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
      <AuthProvider>
        <CartProvider>
          {children}
          <Toaster />
        </CartProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
