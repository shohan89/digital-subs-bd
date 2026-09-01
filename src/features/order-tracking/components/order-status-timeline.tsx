"use client";

import { motion } from "framer-motion";
import { Check, Circle, Loader, X } from "lucide-react";

import { fadeInUp, staggerChildren } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { formatDate } from "@/utils/format-date";
import type { TimelineStep, TimelineStepState } from "@/types/order-tracking";

const STEP_HINT: Record<TimelineStepState, string> = {
  complete: "",
  current: "In progress",
  upcoming: "Not yet",
  failed: "Not completed",
};

function StepIcon({ state }: { state: TimelineStepState }) {
  const base = "flex size-9 shrink-0 items-center justify-center rounded-full border-2";

  if (state === "complete") {
    return (
      <div className={cn(base, "border-primary bg-primary text-primary-foreground")}>
        <Check className="size-4" aria-hidden="true" />
      </div>
    );
  }
  if (state === "current") {
    return (
      <div className={cn(base, "border-primary bg-primary/10 text-primary")}>
        <motion.span animate={{ rotate: 360 }} transition={{ duration: 1.2, ease: "linear", repeat: Infinity }}>
          <Loader className="size-4" aria-hidden="true" />
        </motion.span>
      </div>
    );
  }
  if (state === "failed") {
    return (
      <div className={cn(base, "border-destructive bg-destructive/10 text-destructive")}>
        <X className="size-4" aria-hidden="true" />
      </div>
    );
  }
  return (
    <div className={cn(base, "border-border text-muted-foreground")}>
      <Circle className="size-3" aria-hidden="true" />
    </div>
  );
}

/** Vertical stepper — reads cleanly at any width, unlike a horizontal one that gets cramped with
 * four steps on a phone. */
export function OrderStatusTimeline({ steps }: { steps: TimelineStep[] }) {
  return (
    <motion.ol
      initial="hidden"
      animate="visible"
      variants={staggerChildren}
      className="flex flex-col"
      aria-label="Order status timeline"
    >
      {steps.map((step, index) => (
        <motion.li key={step.key} variants={fadeInUp} className="flex gap-4">
          <div className="flex flex-col items-center">
            <StepIcon state={step.state} />
            {index < steps.length - 1 && (
              <div
                className={cn(
                  "my-1 w-0.5 flex-1 min-h-8 rounded-full",
                  step.state === "complete" ? "bg-primary" : step.state === "failed" ? "bg-destructive/40" : "bg-border",
                )}
              />
            )}
          </div>
          <div className={cn("pb-8 last:pb-0", step.state === "upcoming" && "opacity-60")}>
            <p className={cn("text-sm font-medium", step.state === "failed" && "text-destructive")}>{step.label}</p>
            <p className="text-xs text-muted-foreground">
              {step.timestamp ? formatDate(step.timestamp, "d MMM yyyy, h:mm a") : STEP_HINT[step.state]}
            </p>
          </div>
        </motion.li>
      ))}
    </motion.ol>
  );
}
