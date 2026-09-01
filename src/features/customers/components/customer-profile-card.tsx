import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { USER_ROLE_BADGE_VARIANT } from "@/constants/status-badges";
import { USER_ROLE_LABEL } from "@/constants/customers";
import { formatDate } from "@/utils/format-date";
import type { Customer } from "@/types/customer";

/** Profile fields only — `full_name`/`email`/`phone`/`role`/`created_at`, all straight from
 * `profiles`. Never renders anything from Supabase Auth beyond what's already mirrored onto
 * `profiles` (email, and — via the page's own header badge — disabled/ban status); no raw
 * `auth.admin.getUserById()` response ever reaches this component. */
export function CustomerProfileCard({ customer }: { customer: Customer }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted-foreground">Full name</dt>
            <dd className="font-medium">{customer.fullName ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Email</dt>
            <dd className="font-medium">{customer.email}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Phone</dt>
            <dd className="font-medium">{customer.phone ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Role</dt>
            <dd>
              <Badge variant={USER_ROLE_BADGE_VARIANT[customer.role]}>{USER_ROLE_LABEL[customer.role]}</Badge>
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Joined</dt>
            <dd className="font-medium">{formatDate(customer.createdAt)}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}
