import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Order } from "@/types/order";

export function OrderCustomerCard({ order }: { order: Order }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Customer information</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-muted-foreground">Name</dt>
            <dd className="font-medium">{order.customerName}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Email</dt>
            <dd className="font-medium break-all">{order.customerEmail}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Phone</dt>
            <dd className="font-medium">{order.customerPhone}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}
