/**
 * Type-safe design system constants for the dark fantasy theme.
 *
 * Maps CSS custom property tokens to Tailwind utility class names,
 * so components can apply themed styles without hardcoding values.
 */

/** Tailwind classes for item rarity tier colors */
export const RARITY_COLORS = {
  common: "text-rarity-common",
  uncommon: "text-rarity-uncommon",
  rare: "text-rarity-rare",
  legendary: "text-rarity-legendary",
  mystic: "text-rarity-mystic",
} as const;

export type Rarity = keyof typeof RARITY_COLORS;

/** Tailwind classes for stat value indicators */
export const STAT_COLORS = {
  positive: "text-stat-positive",
  warning: "text-stat-warning",
  negative: "text-stat-negative",
} as const;

export type StatIndicator = keyof typeof STAT_COLORS;
