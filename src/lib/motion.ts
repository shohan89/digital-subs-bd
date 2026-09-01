import type { Transition, Variants } from "framer-motion";

/**
 * Shared Framer Motion primitives so every animated component in the design
 * system moves with the same feel instead of each one picking its own
 * duration/easing. Import these into components under `components/ui` and
 * `components/shared` rather than hand-rolling new transitions.
 */

/** Custom cubic-bezier — a quick, confident ease-out. The brand's default motion curve. */
export const EASE_BRAND = [0.16, 1, 0.3, 1] as const;

export const TRANSITION_FAST: Transition = { duration: 0.15, ease: EASE_BRAND };
export const TRANSITION_DEFAULT: Transition = { duration: 0.25, ease: EASE_BRAND };
export const TRANSITION_SLOW: Transition = { duration: 0.4, ease: EASE_BRAND };

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: TRANSITION_DEFAULT },
};

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: TRANSITION_DEFAULT },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1, transition: TRANSITION_FAST },
};

/** Wrap a list's container with this + `fadeInUp` on each child for a staggered reveal. */
export const staggerChildren: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

export const slideInFromRight: Variants = {
  hidden: { opacity: 0, x: 24 },
  visible: { opacity: 1, x: 0, transition: TRANSITION_DEFAULT },
};
