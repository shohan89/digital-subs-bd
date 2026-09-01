import { redirect } from "next/navigation";

import { ROUTES } from "@/constants/routes";

// Bare /admin has no page of its own — the admin landing page is /admin/dashboard,
// mirroring the customer side's /dashboard.
export default function AdminIndexPage() {
  redirect(ROUTES.adminDashboard);
}
