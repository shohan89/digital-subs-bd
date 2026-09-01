import type { Metadata } from "next";
import { unstable_rethrow } from "next/navigation";

import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  DeliverySettingsForm,
  GeneralSettingsForm,
  PaymentSettingsForm,
  SeoSettingsForm,
  SocialSettingsForm,
} from "@/features/settings/components";
import { requireAdmin } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { settingsService } from "@/services";
import type { SiteSettings } from "@/types/settings";

export const metadata: Metadata = { title: "Settings" };

/** Admin-only, not staff — site-wide configuration, so this page needs its own `requireAdmin()`
 * on top of the `(admin)` layout's `requireStaff()` baseline. */
export default async function AdminSettingsPage() {
  await requireAdmin();

  let settings: SiteSettings | null = null;
  let loadError = false;
  try {
    const supabase = await createServerSupabaseClient();
    settings = await settingsService.getSettings(supabase);
  } catch (error) {
    unstable_rethrow(error);
    loadError = true;
  }

  return (
    <main className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8">
      <div>
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Store info, payment numbers, delivery, SEO, and social links.</p>
      </div>

      {loadError || !settings ? (
        <Alert variant="destructive">
          <AlertDescription>Couldn&apos;t load settings right now. Please try again shortly.</AlertDescription>
        </Alert>
      ) : (
        <div className="flex max-w-2xl flex-col gap-6">
          <GeneralSettingsForm settings={settings.general} />
          <PaymentSettingsForm settings={settings.payment} />
          <DeliverySettingsForm settings={settings.delivery} />
          <SeoSettingsForm settings={settings.seo} />
          <SocialSettingsForm settings={settings.social} />
        </div>
      )}
    </main>
  );
}
