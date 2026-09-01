"use client";

import Link from "next/link";
import { LogOut, Menu } from "lucide-react";

import { logoutAction } from "@/actions/auth.actions";
import { AdminSearch } from "@/components/admin/admin-search";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationBell } from "@/features/notifications/components";
import { ROUTES } from "@/constants/routes";
import type { UserProfile } from "@/types/user";

const ROLE_LABEL: Record<UserProfile["role"], string> = {
  customer: "Customer",
  manager: "Manager",
  admin: "Admin",
};

function AdminAccountMenu({ user }: { user: UserProfile }) {
  const initial = (user.fullName ?? user.email).charAt(0).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 gap-2 rounded-full pr-1 pl-1" aria-label="Admin profile menu">
          <Avatar size="sm">
            <AvatarFallback>{initial}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="flex flex-col gap-1 font-normal">
          <span className="truncate text-sm font-medium text-foreground">{user.fullName ?? "Admin"}</span>
          <span className="truncate text-xs text-muted-foreground">{user.email}</span>
          <Badge variant="outline" className="mt-1 w-fit capitalize">
            {ROLE_LABEL[user.role]}
          </Badge>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={ROUTES.home}>View storefront</Link>
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

type AdminHeaderProps = {
  user: UserProfile;
  onOpenMobileNav: () => void;
};

/** Sticky top bar for the admin shell — mobile nav trigger (hidden on `md:`+, where the sidebar is
 * always visible), section search, notifications, and the account menu. */
export function AdminHeader({ user, onOpenMobileNav }: AdminHeaderProps) {
  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-3 border-b border-border/60 bg-background/80 px-4 backdrop-blur-md sm:px-6">
      <Button variant="ghost" size="icon" className="md:hidden" onClick={onOpenMobileNav} aria-label="Open admin navigation">
        <Menu className="size-5" aria-hidden="true" />
      </Button>

      <div className="min-w-0 flex-1">
        <AdminSearch role={user.role} />
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <NotificationBell />
        <AdminAccountMenu user={user} />
      </div>
    </header>
  );
}
