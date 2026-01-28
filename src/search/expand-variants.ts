/**
 * Equipment expansion for variants.
 *
 * Items with variants expand into multiple candidates for search:
 * - 1 candidate with base stats only (no variant applied)
 * - N candidates for each enabled variant (base + variant stats)
 */

import type {
  EquipmentPiece,
  ExpandedEquipment,
  StatName,
  Stats,
} from "@/models/types";

/** All stat names for safe iteration. */
const STAT_NAMES: readonly StatName[] = [
  "power", "defense", "size", "dexterity", "range", "haste",
  "insanity", "warding", "drawback", "regeneration", "pierce", "resistance",
];

/**
 * Combine two partial stat blocks additively.
 */
function addStats(
  base: Partial<Stats>,
  addition: Partial<Stats>,
): Partial<Stats> {
  const result: Partial<Stats> = { ...base };
  for (const stat of STAT_NAMES) {
    const addValue = addition[stat];
    if (addValue !== undefined) {
      result[stat] = (result[stat] ?? 0) + addValue;
    }
  }
  return result;
}

/**
 * Expand a single equipment piece into one or more candidates.
 *
 * @param item The equipment piece to expand
 * @param enabledVariants Set of variant names the user has enabled in goals
 * @returns Array of expanded equipment candidates
 */
function expandSingleItem(
  item: EquipmentPiece,
  enabledVariants: ReadonlySet<string>,
): ExpandedEquipment[] {
  const results: ExpandedEquipment[] = [];

  // Always include base-only candidate (no variant)
  results.push({
    ...item,
    appliedVariant: undefined,
    effectiveStats: item.baseStats,
  });

  // If item has variants, add candidates for each enabled variant
  if (item.variants) {
    for (const [variantName, variantStats] of Object.entries(item.variants)) {
      if (enabledVariants.has(variantName)) {
        results.push({
          ...item,
          appliedVariant: variantName,
          effectiveStats: addStats(item.baseStats, variantStats),
        });
      }
    }
  }

  return results;
}

/**
 * Expand an array of equipment pieces into expanded candidates.
 *
 * @param items Equipment pieces to expand
 * @param enabledVariants Set of variant names the user has enabled in goals
 * @returns Array of expanded equipment candidates
 */
export function expandEquipment(
  items: readonly EquipmentPiece[],
  enabledVariants: ReadonlySet<string>,
): readonly ExpandedEquipment[] {
  return items.flatMap((item) => expandSingleItem(item, enabledVariants));
}

/**
 * Get all unique variant names that exist on a set of equipment.
 * Useful for UI to show which variants are available.
 */
export function getAvailableVariants(
  items: readonly EquipmentPiece[],
): ReadonlySet<string> {
  const variants = new Set<string>();
  for (const item of items) {
    if (item.variants) {
      for (const variantName of Object.keys(item.variants)) {
        variants.add(variantName);
      }
    }
  }
  return variants;
}
