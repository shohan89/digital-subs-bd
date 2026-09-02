import type { Transition, Variants } from "framer-motion";

/**
 * Shared Framer Motion primitives so every animated component in the design
 * system moves with the same feel instead of each one picking its own
 * duration/easing. Import these into components under `components/ui` and
 * `components/shared` rather than hand-rolling new transitions.
 */

/** Custom cubic-bezier — a quick, confident ease-out. The brand's default motion curve. */
export const EASE_BRAND = [0.16, 1, 0.3, 1] as const;

export const TRANSITION_DEFAULT: Transition = { duration: 0.25, ease: EASE_BRAND };

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: TRANSITION_DEFAULT },
};

/** Wrap a list's container with this + `fadeInUp` on each child for a staggered reveal. */
export const staggerChildren: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};
