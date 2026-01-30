/**
 * Pool filtering utilities for search optimization.
 *
 * Reduces search space by removing items that don't contribute to goal stats,
 * while preserving items with sockets (for enhancement flexibility).
 */

import type { EquipmentPiece, GearPool, SoftConstraint, StatName, Stats } from "@/models/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Statistics about pool filtering. */
export interface PoolFilterStats {
  readonly original: PoolCounts;
  readonly filtered: PoolCounts;
}

export interface PoolCounts {
  readonly chestplates: number;
  readonly leggings: number;
  readonly accessories: number;
}

// ---------------------------------------------------------------------------
// Filter Logic
// ---------------------------------------------------------------------------

/**
 * Extract target stats from fitness constraints.
 */
function getTargetStats(constraints: readonly SoftConstraint[]): Set<StatName> {
  return new Set(constraints.map((c) => c.stat));
}

/** Type guard for items with effectiveStats (ExpandedEquipment). */
function hasEffectiveStats(item: EquipmentPiece): item is EquipmentPiece & { effectiveStats: Partial<Stats> } {
  return "effectiveStats" in item;
}

/**
 * Get the effective stats from an equipment piece.
 * Handles both EquipmentPiece (baseStats) and ExpandedEquipment (effectiveStats).
 */
function getEffectiveStats(item: EquipmentPiece): Partial<Stats> {
  // At runtime, pool items are ExpandedEquipment with effectiveStats
  return hasEffectiveStats(item) ? item.effectiveStats : item.baseStats;
}

/**
 * Check if equipment contributes to any target stat OR has sockets.
 * Items with sockets are kept because enhancements can add goal stats.
 */
function isRelevantItem(item: EquipmentPiece, targetStats: Set<StatName>): boolean {
  // Keep items with sockets (enhancements can contribute goal stats)
  if (item.socketCount > 0) return true;

  // Keep items that contribute any goal stat (positive or negative)
  const stats = getEffectiveStats(item);
  for (const stat of targetStats) {
    if ((stats[stat] ?? 0) !== 0) return true;
  }

  return false;
}

/**
 * Filter equipment array, keeping items relevant to goals.
 */
function filterEquipment(
  items: readonly EquipmentPiece[],
  targetStats: Set<StatName>,
): readonly EquipmentPiece[] {
  if (targetStats.size === 0) return items; // No goals = keep all
  return items.filter((item) => isRelevantItem(item, targetStats));
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Filter gear pool to only include items relevant to fitness goals.
 * Keeps items that either contribute a goal stat or have sockets.
 *
 * Returns the filtered pool and statistics about what was pruned.
 */
export function filterPoolByGoals(
  pool: GearPool,
  constraints: readonly SoftConstraint[],
): { readonly pool: GearPool; readonly stats: PoolFilterStats } {
  const targetStats = getTargetStats(constraints);

  const original: PoolCounts = {
    chestplates: pool.chestplates.length,
    leggings: pool.leggings.length,
    accessories: pool.accessories.length,
  };

  // If no constraints, return original pool
  if (targetStats.size === 0) {
    return { pool, stats: { original, filtered: original } };
  }

  const filteredPool: GearPool = {
    chestplates: filterEquipment(pool.chestplates, targetStats),
    leggings: filterEquipment(pool.leggings, targetStats),
    accessories: filterEquipment(pool.accessories, targetStats),
    // Keep all enhancements - they're assigned dynamically based on goals
    enchantments: pool.enchantments,
    modifiers: pool.modifiers,
    gems: pool.gems,
  };

  const filtered: PoolCounts = {
    chestplates: filteredPool.chestplates.length,
    leggings: filteredPool.leggings.length,
    accessories: filteredPool.accessories.length,
  };

  return { pool: filteredPool, stats: { original, filtered } };
}

/**
 * Format filter stats for display.
 * Returns null if no items were pruned.
 */
export function formatFilterStats(stats: PoolFilterStats): string | null {
  const prunedChest = stats.original.chestplates - stats.filtered.chestplates;
  const prunedLegs = stats.original.leggings - stats.filtered.leggings;
  const prunedAcc = stats.original.accessories - stats.filtered.accessories;
  const totalPruned = prunedChest + prunedLegs + prunedAcc;

  if (totalPruned === 0) return null;

  const parts: string[] = [];
  if (prunedChest > 0) parts.push(`${String(prunedChest)} chest`);
  if (prunedLegs > 0) parts.push(`${String(prunedLegs)} legs`);
  if (prunedAcc > 0) parts.push(`${String(prunedAcc)} acc`);

  return `Pruned ${parts.join(", ")} (no goal stats)`;
}
