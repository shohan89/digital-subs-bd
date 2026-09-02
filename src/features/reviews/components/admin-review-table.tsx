import { Star } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { StarRating } from "@/components/shared/star-rating";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { REVIEW_STATUS_BADGE_VARIANT } from "@/constants/status-badges";
import { REVIEW_STATUS_LABEL } from "@/constants/reviews";
import { AdminReviewRowActions } from "@/features/reviews/components/admin-review-row-actions";
import { formatDate } from "@/utils/format-date";
import type { AdminReview } from "@/types/review";

export function AdminReviewTable({ reviews }: { reviews: AdminReview[] }) {
  if (reviews.length === 0) {
    return <EmptyState icon={Star} message="No reviews match your filters." />;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border/60">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Customer</TableHead>
            <TableHead>Product</TableHead>
            <TableHead>Rating</TableHead>
            <TableHead>Comment</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reviews.map((review) => (
            <TableRow key={review.id}>
              <TableCell>
                <div className="flex flex-col">
                  <span className="font-medium">{review.reviewerName ?? "Customer"}</span>
                  <span className="text-xs text-muted-foreground">{review.reviewerEmail}</span>
                </div>
              </TableCell>
              <TableCell>{review.productName ?? "Product"}</TableCell>
              <TableCell>
                <StarRating value={review.rating} />
              </TableCell>
              <TableCell className="max-w-xs truncate">{review.comment}</TableCell>
              <TableCell className="text-muted-foreground">{formatDate(review.createdAt)}</TableCell>
              <TableCell>
                <Badge variant={REVIEW_STATUS_BADGE_VARIANT[review.status]}>{REVIEW_STATUS_LABEL[review.status]}</Badge>
              </TableCell>
              <TableCell>
                <AdminReviewRowActions review={review} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
