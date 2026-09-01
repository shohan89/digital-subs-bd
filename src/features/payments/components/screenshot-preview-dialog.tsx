"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LoadingSpinner } from "@/components/shared/loading-spinner";

type ScreenshotPreviewDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string | null;
  isLoading: boolean;
};

/** One shared dialog reused across every row in `AdminPaymentTable`/`OrderPaymentCard` — showing
 * the time-limited signed URL fetched on demand for whichever row's "View screenshot" was
 * clicked. */
export function ScreenshotPreviewDialog({ open, onOpenChange, url, isLoading }: ScreenshotPreviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Payment screenshot</DialogTitle>
        </DialogHeader>
        <div className="flex min-h-48 items-center justify-center">
          {isLoading ? (
            <LoadingSpinner label="Loading screenshot" />
          ) : url ? (
            // eslint-disable-next-line @next/next/no-img-element -- a signed URL into private Storage, not an optimizable static/remote asset
            <img src={url} alt="Submitted payment screenshot" className="max-h-[70vh] w-full rounded-lg object-contain" />
          ) : (
            <p className="text-sm text-muted-foreground">Couldn&apos;t load this screenshot.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
