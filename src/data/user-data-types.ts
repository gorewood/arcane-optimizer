/**
 * TypeScript interfaces for user data management.
 *
 * Supports user overrides of bundled game data (equipment, enchantments,
 * modifiers, gems, variant types) with soft deletion and version tracking.
 */

import type {
  EquipmentPiece,
  Enchantment,
  Modifier,
  Gem,
  VariantTypeEntry,
  VariantTypes,
} from "@/models/types";

// ---------------------------------------------------------------------------
// User Item Records
// ---------------------------------------------------------------------------

/**
 * Generic user override record for any item type.
 *
 * Records track:
 * - User-created items (data present, no bundled counterpart)
 * - Soft-deleted bundled items (deleted: true, data absent)
 * - Modified bundled items (data present, baseVersion set)
 */
export interface UserItemRecord<T> {
  readonly id: string;
  /** True = bundled item is hidden from the merged view. */
  readonly deleted?: boolean | undefined;
  /** Item data. Undefined when this is a delete-only marker. */
  readonly data?: T | undefined;
  /** Version of the bundled data this record was based on. */
  readonly baseVersion?: number | undefined;
  readonly createdAt: number;
  readonly updatedAt: number;
}

/** User override record for equipment pieces. */
export type UserEquipmentRecord = UserItemRecord<EquipmentPiece>;

/** User override record for enchantments. */
export type UserEnchantmentRecord = UserItemRecord<Enchantment>;

/** User override record for modifiers. */
export type UserModifierRecord = UserItemRecord<Modifier>;

/** User override record for gems. */
export type UserGemRecord = UserItemRecord<Gem>;

// ---------------------------------------------------------------------------
// Variant Types Overrides
// ---------------------------------------------------------------------------

/**
 * User overrides for variant types.
 *
 * Variant types are a keyed record, so we track:
 * - additions: new keys added by user
 * - modifications: overrides of bundled keys
 * - deletedKeys: bundled keys the user has hidden
 */
export interface UserVariantTypes {
  readonly additions: Readonly<Record<string, VariantTypeEntry>>;
  readonly modifications: Readonly<Record<string, VariantTypeEntry>>;
  readonly deletedKeys: readonly string[];
}

// ---------------------------------------------------------------------------
// Merged Items (for display)
// ---------------------------------------------------------------------------

/**
 * A merged item combining bundled and user data for display.
 *
 * Used by UI to show item source and modification state.
 */
export interface MergedItem<T> {
  readonly item: T;
  /** "bundled" = from game data, "user" = user-created */
  readonly source: "bundled" | "user";
  /** True if user modified a bundled item. */
  readonly isModified: boolean;
  /** True if item is deleted (for restore UI). */
  readonly isDeleted: boolean;
}

// ---------------------------------------------------------------------------
// Storage Format
// ---------------------------------------------------------------------------

/**
 * localStorage storage format for user data.
 *
 * Schema version enables future migrations.
 */
export interface UserDataStorage {
  readonly schemaVersion: 1;
  readonly bundledVersion: number;
  readonly equipment: readonly UserEquipmentRecord[];
  readonly enchantments: readonly UserEnchantmentRecord[];
  readonly modifiers: readonly UserModifierRecord[];
  readonly gems: readonly UserGemRecord[];
  readonly variantTypes: UserVariantTypes;
}

// ---------------------------------------------------------------------------
// Export Format
// ---------------------------------------------------------------------------

/**
 * Export format for sharing user data.
 *
 * Contains fully-resolved items (not records) for portability.
 */
export interface UserDataExport {
  readonly formatVersion: 1;
  readonly exportedAt: number;
  readonly equipment: readonly EquipmentPiece[];
  readonly enchantments: readonly Enchantment[];
  readonly modifiers: readonly Modifier[];
  readonly gems: readonly Gem[];
  readonly variantTypes: VariantTypes;
  readonly deletedBundledIds: {
    readonly equipment: readonly string[];
    readonly enchantments: readonly string[];
    readonly modifiers: readonly string[];
    readonly gems: readonly string[];
    readonly variantTypes: readonly string[];
  };
}
