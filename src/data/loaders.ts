/**
 * Data loaders — import JSON game data and validate through Zod schemas.
 *
 * Each loader returns fully typed, validated domain objects. Invalid data
 * throws a ZodError at load time (fail-fast).
 */

import type {
  Enchantment,
  EquipmentPiece,
  GearPool,
  Gem,
  Modifier,
  VariantTypes,
} from "@/models/types";

import {
  enchantmentArraySchema,
  equipmentArraySchema,
  gemArraySchema,
  modifierArraySchema,
  variantTypesSchema,
} from "./schemas";

import rawEquipment from "./equipment.json";
import rawEnchantments from "./enchantments.json";
import rawModifiers from "./modifiers.json";
import rawGems from "./gems.json";
import rawVariantTypes from "./variant-types.json";

// ---------------------------------------------------------------------------
// Individual loaders
// ---------------------------------------------------------------------------

/** Validate and return all equipment pieces. */
export function loadEquipment(): readonly EquipmentPiece[] {
  return equipmentArraySchema.parse(rawEquipment);
}

/** Validate and return all enchantments. */
export function loadEnchantments(): readonly Enchantment[] {
  return enchantmentArraySchema.parse(rawEnchantments);
}

/** Validate and return all modifiers. */
export function loadModifiers(): readonly Modifier[] {
  return modifierArraySchema.parse(rawModifiers);
}

/** Validate and return all gems. */
export function loadGems(): readonly Gem[] {
  return gemArraySchema.parse(rawGems);
}

/** Validate and return variant type groupings. */
export function loadVariantTypes(): VariantTypes {
  return variantTypesSchema.parse(rawVariantTypes);
}

// ---------------------------------------------------------------------------
// Aggregate loader
// ---------------------------------------------------------------------------

/** Load all game data and partition equipment by slot type. */
export function loadGearPool(): GearPool {
  const equipment = loadEquipment();

  return {
    chestplates: equipment.filter((e) => e.slot === "chestplate"),
    leggings: equipment.filter((e) => e.slot === "leggings"),
    accessories: equipment.filter((e) =>
      e.slot === "accessory" ||
      e.slot === "accessory-H" ||
      e.slot === "accessory-A",
    ),
    enchantments: loadEnchantments(),
    modifiers: loadModifiers(),
    gems: loadGems(),
  };
}
