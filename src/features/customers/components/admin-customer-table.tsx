import Link from "next/link";
import { Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { USER_ROLE_BADGE_VARIANT } from "@/constants/status-badges";
import { USER_ROLE_LABEL } from "@/constants/customers";
import { ROUTES } from "@/constants/routes";
import { formatDate } from "@/utils/format-date";
import type { Customer } from "@/types/customer";

export function AdminCustomerTable({ customers }: { customers: Customer[] }) {
  if (customers.length === 0) {
    return <EmptyState icon={Users} message="No customers match your filters." />;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border/60">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Joined</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {customers.map((customer) => (
            <TableRow key={customer.id}>
              <TableCell>
                <Link href={ROUTES.adminCustomerDetail(customer.id)} className="font-medium text-primary hover:underline">
                  {customer.fullName ?? "—"}
                </Link>
              </TableCell>
              <TableCell className="text-muted-foreground">{customer.email}</TableCell>
              <TableCell className="text-muted-foreground">{customer.phone ?? "—"}</TableCell>
              <TableCell>
                <Badge variant={USER_ROLE_BADGE_VARIANT[customer.role]}>{USER_ROLE_LABEL[customer.role]}</Badge>
              </TableCell>
              <TableCell>
                <Badge variant={customer.disabled ? "destructive" : "outline"}>{customer.disabled ? "Disabled" : "Active"}</Badge>
              </TableCell>
              <TableCell className="text-right text-muted-foreground">{formatDate(customer.createdAt)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
