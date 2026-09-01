"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, LogOut, Menu, Sparkles } from "lucide-react";

import { logoutAction } from "@/actions/auth.actions";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { CartSheet } from "@/features/cart/components";
import { NotificationBell } from "@/features/notifications/components";
import { Container } from "@/components/shared/container";
import { useAuth } from "@/hooks/use-auth";
import { MARKETING_NAV } from "@/constants/navigation";
import { ROUTES } from "@/constants/routes";
import { siteConfig } from "@/constants/site";
import { cn } from "@/lib/utils";

function Logo({ storeName }: { storeName: string }) {
  return (
    <Link href={ROUTES.home} className="flex items-center gap-2 font-heading text-lg font-semibold">
      <Sparkles className="size-5 text-primary" aria-hidden="true" />
      {storeName}
    </Link>
  );
}

// "My Account" isn't in MARKETING_NAV (Home/Shop/Categories) — it always points at /dashboard
// regardless of auth state; an unauthenticated click just gets bounced through
// /login?redirectTo=/dashboard by middleware, which is the standard, expected UX for this.
function NavLinks({ className, onNavigate }: { className?: string; onNavigate?: () => void }) {
  const pathname = usePathname();
  const items = [...MARKETING_NAV, { label: "My Account", href: ROUTES.dashboard }];

  return (
    <>
      {items.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            onClick={onNavigate}
            className={cn(
              "text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
              isActive && "text-foreground",
              className,
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </>
  );
}

function AccountMenu({ email }: { email: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full" aria-label="Account menu">
          <Avatar size="sm">
            <AvatarFallback>{email.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel className="max-w-48 truncate font-normal text-muted-foreground">{email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={ROUTES.dashboard}>
            <LayoutDashboard aria-hidden="true" />
            Dashboard
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <form action={logoutAction} className="contents">
          <DropdownMenuItem asChild variant="destructive">
            <button type="submit" className="w-full">
              <LogOut aria-hidden="true" />
              Sign out
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Sticky, translucent-blur marketing header. Desktop nav inline; mobile nav in a `Sheet` drawer.
 * `storeName` comes from `/admin/settings`' General section via `MarketingLayout`'s server-side
 * fetch — falls back to `siteConfig.name` if that fetch failed or wasn't provided (e.g. Storybook,
 * a future test render). */
export function Navbar({ storeName = siteConfig.name }: { storeName?: string }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const closeMobileNav = () => setMobileNavOpen(false);
  const { user, isLoading } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <Container>
        <div className="flex h-16 items-center justify-between">
          <Logo storeName={storeName} />

          <nav aria-label="Primary" className="hidden items-center gap-6 md:flex">
            <NavLinks />
          </nav>

          <div className="flex items-center gap-1">
            {!isLoading && user && <NotificationBell />}
            <CartSheet />

            <div className="hidden md:block">
              {!isLoading && user ? (
                <AccountMenu email={user.email ?? ""} />
              ) : (
                <Button asChild>
                  <Link href={ROUTES.login}>Login</Link>
                </Button>
              )}
            </div>

            <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
                  <Menu className="size-5" aria-hidden="true" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right">
                <SheetHeader>
                  <SheetTitle>{storeName}</SheetTitle>
                </SheetHeader>
                <nav aria-label="Primary" className="flex flex-col gap-4 px-4">
                  <NavLinks className="text-base" onNavigate={closeMobileNav} />
                </nav>
                <div className="mt-auto flex flex-col gap-2 p-4">
                  {!isLoading && user ? (
                    <>
                      <Button variant="outline" asChild onClick={closeMobileNav}>
                        <Link href={ROUTES.dashboard}>Dashboard</Link>
                      </Button>
                      <form action={logoutAction}>
                        <Button type="submit" variant="ghost" className="w-full">
                          Sign out
                        </Button>
                      </form>
                    </>
                  ) : (
                    <Button asChild onClick={closeMobileNav}>
                      <Link href={ROUTES.login}>Login</Link>
                    </Button>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </Container>
    </header>
  );
}
