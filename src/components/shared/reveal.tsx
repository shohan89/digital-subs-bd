"use client";

import type { PropsWithChildren } from "react";
import { motion, type Variants } from "framer-motion";

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
 */
export function Reveal({ children, className, delay = 0 }: RevealProps) {
  const variants: Variants = {
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
