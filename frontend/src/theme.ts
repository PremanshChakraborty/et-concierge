/**
 * theme.ts — Single source of truth for all design tokens.
 * Derived directly from the Stitch prototype Tailwind config + custom CSS classes.
 * Change colors/gradients/typography here; everywhere else references these values.
 */

export const colors = {
  primary:     "#7c3bed",
  surface:     "#f9f9f9",
  border:      "#e5e5e5",
  textPrimary: "#000000",
  textMuted:   "#737373", // neutral-500
  textSubdued: "#a3a3a3", // neutral-400
  white:       "#ffffff",
  black:       "#000000",
};

/** Signature multi-stop gradient — user bubbles, CTA buttons, logo text */
export const gradients = {
  premiumV: "linear-gradient(to top,  #fcc5e4 0%, #fda34b 15%, #ff7882 35%, #c8699e 52%, #7046aa 76%, #0c1db8 100%)",
  premiumH: "linear-gradient(to right, #fcc5e4 0%, #fda34b 15%, #ff7882 35%, #c8699e 52%, #7046aa 76%, #0c1db8 100%)",
};

export const font = {
  family:  "'Inter', sans-serif",
  sizes: {
    xxs:  "9px",
    xs:   "10px",
    sm:   "11px",
    base: "12px",
    md:   "13px",
    lg:   "14px",
    xl:   "16px",
    "2xl": "20px",
    "3xl": "24px",
  },
  weights: { normal: 400, medium: 500, semibold: 600, bold: 700, black: 900 },
  tracking: { tight: "-0.03em", wide: "0.05em", wider: "0.1em", widest: "0.15em" },
};

export const radius = { sm: "6px", md: "10px", lg: "12px", xl: "16px", "2xl": "20px", full: "9999px" };
export const spacing = { xs: "4px", sm: "8px", md: "12px", lg: "16px", xl: "24px", "2xl": "32px" };
