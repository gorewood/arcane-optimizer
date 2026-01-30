/**
 * Efficiency Points scoring mode.
 *
 * Simple normalized stat sum using stat ratios. Each stat contributes
 * based on how "expensive" it is in the game's gear budget:
 * - Power: 1/3 ratio (3 power = 1 efficiency point)
 * - Defense: 3 ratio (1 defense = 1/3 efficiency point)
 * - Secondary stats: 1 ratio (1 stat = 1 point)
 */

import type { StatName, Stats } from "@/models/types";
import { STAT_NAMES } from "./stats";

// ---------------------------------------------------------------------------
// Stat Efficiency Ratios
// ---------------------------------------------------------------------------

/**
 * How many points of each stat equal 1 "efficiency point".
 * Higher ratio = stat is more expensive/harder to get.
 * Lower ratio = stat is cheaper/easier to get.
 */
export const STAT_EFFICIENCY_RATIOS: Readonly<Record<StatName, number>> = {
  power: 3, // 3 power = 1 efficiency point (power is cheap)
  defense: 0.333, // 1 defense = ~3 efficiency points (defense is expensive)
  size: 1,
  dexterity: 1,
  range: 1,
  haste: 1,
  regeneration: 1,
  resistance: 1,
  pierce: 1,
  insanity: 1,
  warding: 1,
  drawback: 1,
} as const;

// ---------------------------------------------------------------------------
// Efficiency Score Calculation
// ---------------------------------------------------------------------------

/**
 * Compute efficiency score for a stat block.
 *
 * For each stat: (stat_value / ratio) * (weight / 100)
 * Returns the sum of all weighted efficiency contributions.
 *
 * @param stats - The stat block to evaluate
 * @param weights - User weights for each stat (0-200, 100 = normal)
 * @returns Total efficiency score
 */
export function computeEfficiencyScore(
  stats: Stats,
  weights: Readonly<Record<StatName, number>>,
): number {
  let score = 0;

  for (const stat of STAT_NAMES) {
    const value = stats[stat];
    const ratio = STAT_EFFICIENCY_RATIOS[stat];
    const weight = weights[stat];

    // Skip stats with zero weight
    if (weight === 0) continue;

    // Efficiency contribution: value / ratio * (weight / 100)
    score += (value / ratio) * (weight / 100);
  }

  return score;
}
