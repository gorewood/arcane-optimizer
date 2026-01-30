/**
 * Multiplier scoring mode with diminishing returns.
 *
 * Implements game-accurate damage/survivability calculations using
 * Metapoly's formulas for secondary stat scaling. This mode rewards
 * balanced stat distributions over stacking a single stat.
 */

import type { StatName, Stats } from "@/models/types";

// ---------------------------------------------------------------------------
// Game Constants (Level 175)
// ---------------------------------------------------------------------------

/** Base health at level 175: 100 + 9×174 = 1666. AO Guides uses 1456. */
export const BASE_HEALTH = 1456;

/** Base attack at level 175: 20 + 174 = 194. */
export const BASE_ATTACK = 194;

// ---------------------------------------------------------------------------
// Formula Weights (baked into AO Guides scoring)
// ---------------------------------------------------------------------------

/**
 * Internal formula weights for secondary stats.
 * These determine how much each stat contributes to the multiplier.
 */
export const STAT_FORMULA_WEIGHTS: Partial<Readonly<Record<StatName, number>>> = {
  size: 0.575,
  haste: 1.0,
  dexterity: 0.525, // "speed" in AO Guides
  range: 0.8,
  regeneration: 0.5,
  resistance: 0.55,
  pierce: 1.0,
} as const;

// ---------------------------------------------------------------------------
// Diminishing Returns Formula
// ---------------------------------------------------------------------------

/**
 * Calculate diminishing returns multiplier for a secondary stat.
 *
 * Uses Metapoly's formula:
 * f(stat) = 1 + (1.35/100) × [
 *   (16 × ln(coef×stat + 4)³ × 0.09 + linearCoef×stat) / (0.1 + 0.15 × √175) - 0.79
 * ]
 *
 * @param stat - The stat value
 * @param isHaste - If true, uses haste-specific coefficients (scales faster)
 * @returns Multiplier value (≥1.0)
 */
export function secondaryStatMultiplier(stat: number, isHaste = false): number {
  // Handle edge cases
  if (stat <= 0) return 1;

  const coef = isHaste ? 0.2 : 0.1;
  const linearCoef = isHaste ? 0.3 : 0.15;
  const denominator = 0.1 + 0.15 * Math.sqrt(175);

  const logArg = coef * stat + 4;
  // Guard against log of non-positive (shouldn't happen with stat > 0 and coef > 0)
  if (logArg <= 0) return 1;

  const logTerm = Math.pow(Math.log(logArg), 3) * 0.09 * 16;
  const linearTerm = linearCoef * stat;
  const numerator = logTerm + linearTerm;

  const result = 1 + (1.35 / 100) * (numerator / denominator - 0.79);

  // Ensure we don't return less than 1 due to floating point
  return Math.max(1, result);
}

// ---------------------------------------------------------------------------
// Combined Multiplier Score
// ---------------------------------------------------------------------------

/**
 * Compute multiplier score for a stat block.
 *
 * Base multiplier from power/defense:
 *   ((1 + defense/BASE_HEALTH) × defWeight + 1) × ((power/BASE_ATTACK) × powWeight + 1)
 *
 * Secondary stats apply diminishing returns via secondaryStatMultiplier,
 * weighted by both formula weights and user weights.
 *
 * @param stats - The stat block to evaluate
 * @param weights - User weights for each stat (0-200, 100 = normal)
 * @returns Combined multiplier score (≥1.0)
 */
/** Secondary stats that have formula weights. */
const SECONDARY_STATS_WITH_WEIGHTS: readonly StatName[] = [
  "size",
  "haste",
  "dexterity",
  "range",
  "regeneration",
  "resistance",
  "pierce",
] as const;

export function computeMultiplierScore(
  stats: Stats,
  weights: Readonly<Record<StatName, number>>,
): number {
  const defWeight = weights.defense / 100;
  const powWeight = weights.power / 100;

  // Base multiplier from power/defense
  const defenseBonus = (1 + stats.defense / BASE_HEALTH) * defWeight;
  const powerBonus = (stats.power / BASE_ATTACK) * powWeight;
  const baseMultiplier = (defenseBonus + 1) * (powerBonus + 1);

  // Secondary stats with diminishing returns
  let secondaryMult = 1;

  for (const statName of SECONDARY_STATS_WITH_WEIGHTS) {
    const formulaWeight = STAT_FORMULA_WEIGHTS[statName];
    if (formulaWeight == null) continue;

    const value = stats[statName];
    const userWeight = weights[statName] / 100;

    // Skip if user weight is 0
    if (userWeight === 0) continue;

    const isHaste = statName === "haste";
    const statMult = secondaryStatMultiplier(value, isHaste);

    // Apply formula weight and user weight via exponentiation
    secondaryMult *= Math.pow(statMult, formulaWeight * userWeight);
  }

  return baseMultiplier * secondaryMult;
}
