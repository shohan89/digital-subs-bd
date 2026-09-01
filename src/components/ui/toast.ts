/**
 * "Toast" in this design system is Sonner, not a Radix Toast primitive —
 * the shadcn CLI only ships a Radix toast for Base UI projects; Sonner is
 * the recommended replacement for Radix-based projects like this one (see
 * `components/ui/sonner.tsx` for the `<Toaster />` already mounted in
 * `components/providers`). Re-exported here under the requested "Toast"
 * name so call sites can `import { toast } from "@/components/ui/toast"`.
 *
 * Usage: toast("Order placed"), toast.success("Payment confirmed"),
 * toast.error("Could not renew subscription").
 */
export { toast } from "sonner";
export { Toaster } from "@/components/ui/sonner";
