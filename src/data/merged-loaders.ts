/**
 * Merged data loaders — combine bundled data with user overrides for search.
 *
 * These functions extract items from MergedItem wrappers, filtering out
 * deleted items and partitioning by slot type for the gear pool.
 */

import type {
  Enchantment,
  EquipmentPiece,
  GearPool,
  Gem,
  Modifier,
} from "@/models/types";
import type { MergedItem } from "./user-data-types";

// ---------------------------------------------------------------------------
// Extraction helpers
// ---------------------------------------------------------------------------

/**
 * Extract non-deleted items from MergedItem array.
 * User-created items (source === "user") are always included.
 * Bundled items are filtered by the enabled IDs set.
 */
function extractItems<T extends { readonly id: string }>(
  merged: readonly MergedItem<T>[],
  enabledIds: ReadonlySet<string>,
): readonly T[] {
  return merged
    .filter((m) => !m.isDeleted)
    .filter((m) => m.source === "user" || enabledIds.has(m.item.id))
    .map((m) => m.item);
}

// ---------------------------------------------------------------------------
// Gear pool builder
// ---------------------------------------------------------------------------

export interface MergedGetters {
  readonly getMergedEquipment: () => readonly MergedItem<EquipmentPiece>[];
  readonly getMergedEnchantments: () => readonly MergedItem<Enchantment>[];
  readonly getMergedModifiers: () => readonly MergedItem<Modifier>[];
  readonly getMergedGems: () => readonly MergedItem<Gem>[];
}

export interface EnabledIds {
  readonly equipment: ReadonlySet<string>;
  readonly enchantments: ReadonlySet<string>;
  readonly modifiers: ReadonlySet<string>;
  readonly gems: ReadonlySet<string>;
}

/**
 * Build a gear pool from merged user data.
 *
 * - Filters out deleted items
 * - User-created items (source === "user") are always included
 * - Bundled items are filtered by enabled IDs
 */
export function buildMergedGearPool(
  getters: MergedGetters,
  enabledIds: EnabledIds,
): GearPool {
  const equipment = extractItems(getters.getMergedEquipment(), enabledIds.equipment);
  const enchantments = extractItems(getters.getMergedEnchantments(), enabledIds.enchantments);
  const modifiers = extractItems(getters.getMergedModifiers(), enabledIds.modifiers);
  const gems = extractItems(getters.getMergedGems(), enabledIds.gems);

  // Partition equipment by slot type
  const isAccessory = (e: EquipmentPiece): boolean =>
    e.slot === "accessory" ||
    e.slot === "accessory-H" ||
    e.slot === "accessory-A";

  return {
    chestplates: equipment.filter((e) => e.slot === "chestplate"),
    leggings: equipment.filter((e) => e.slot === "leggings"),
    accessories: equipment.filter(isAccessory),
    enchantments,
    modifiers,
    gems,
  };
}
