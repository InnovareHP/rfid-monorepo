import { easeIn, easeOut, type Variants } from "framer-motion";

export const pageVariants: Variants = {
  initial: { opacity: 0, x: 40 },
  animate: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.35,
      ease: easeOut, // 👈 correctly typed easing
    },
  },
  exit: {
    opacity: 0,
    x: -40,
    transition: {
      duration: 0.25,
      ease: easeIn, // 👈 correctly typed easing
    },
  },
};

export const springTap = {
  scale: 0.95,
  transition: { type: "spring", stiffness: 400, damping: 20 },
};

export const itemVariants: Variants = {
  initial: { opacity: 0, y: 6 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.25, ease: [0.33, 1, 0.68, 1] }, // ease-out
  },
};

export const listVariants: Variants = {
  /* The list itself doesn’t move, it just orchestrates its children */
  animate: {
    transition: {
      staggerChildren: 0.08, //⏱ 80 ms between badges
      delayChildren: 0.2, //⏱ wait 200 ms before the first one
    },
  },
};

export const container = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.05,
    },
  },
};

export const letter = {
  hidden: { opacity: 0, y: `0.25em` },
  visible: {
    opacity: 1,
    y: `0em`,
    transition: { duration: 0.4, ease: [0.2, 0.65, 0.3, 0.9] },
  },
};
