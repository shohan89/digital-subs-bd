import type { Metadata } from "next";

import { ProfileForm } from "@/features/profile/components";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Your Profile" };

export default async function DashboardProfilePage() {
  const user = await requireUser();

  return (
    <main className="flex-1 p-8">
      <h1 className="text-xl font-semibold">Your profile</h1>
      <div className="mt-6">
        <ProfileForm user={user} />
      </div>
    </main>
  );
}
