"use client";

import type { PropsWithChildren } from "react";
import { motion, useReducedMotion, type Variants } from "framer-motion";

import { EASE_BRAND } from "@/lib/motion";

type RevealProps = PropsWithChildren<{
  className?: string;
  /** Stagger successive items in a list by passing an incrementing delay (e.g. `index * 0.06`). */
  delay?: number;
}>;

/**
 * Thin client boundary around a Framer Motion fade/slide-in, triggered once when scrolled into
 * view. Lets the sections that use it (categories, products, ...) stay Server Components that
 * fetch their own data — only this leaf needs `"use client"`.
 *
 * Honors `prefers-reduced-motion` via Framer Motion's `useReducedMotion()` — without this, content
 * sat at `opacity: 0` until scrolled into view regardless of the visitor's OS-level reduced-motion
 * setting, which is both a real accessibility gap (motion-sensitive visitors get animation they
 * explicitly opted out of) and made every fullPage screenshot of a content-heavy page look empty
 * below the fold. Reduced-motion visitors now get the content immediately, no transform/opacity
 * animation at all.
 */
export function Reveal({ children, className, delay = 0 }: RevealProps) {
  const shouldReduceMotion = useReducedMotion();

  const variants: Variants = shouldReduceMotion
    ? { hidden: { opacity: 1, y: 0 }, visible: { opacity: 1, y: 0 } }
    : {
        hidden: { opacity: 0, y: 16 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE_BRAND, delay } },
      };

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
      variants={variants}
      className={className}
    >
      {children}
    </motion.div>
  );
}
