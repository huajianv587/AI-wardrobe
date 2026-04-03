export const fadeInUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -16 },
  transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }
} as const;

export const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.1
    }
  }
} as const;

export const slideInFromRight = {
  initial: { opacity: 0, x: 60 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -40 },
  transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }
} as const;

export const scaleIn = {
  initial: { opacity: 0, scale: 0.92 },
  animate: { opacity: 1, scale: 1 },
  transition: { duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }
} as const;

export const cardHover = {
  rest: { scale: 1, y: 0, boxShadow: "0 4px 20px rgba(180,120,140,0.08)" },
  hover: { scale: 1.03, y: -4, boxShadow: "0 12px 40px rgba(180,120,140,0.2)" }
} as const;
