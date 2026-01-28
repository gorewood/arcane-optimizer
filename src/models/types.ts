/**
 * Domain types for the AO Armor Optimizer.
 *
 * Pure type definitions — no runtime code. All stat names use current
 * in-game names as of Full Release v1.20.
 */

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

/** All 12 stat names (Full Release v1.20 — current). */
export type StatName =
  | "power"
  | "defense"
  | "size"
  | "dexterity"
  | "range"
  | "haste"
  | "insanity"
  | "warding"
  | "drawback"
  | "regeneration"
  | "pierce"
  | "resistance";

/** Complete stat block — every stat has a numeric value. */
export type Stats = Record<StatName, number>;

// ---------------------------------------------------------------------------
// Equipment
// ---------------------------------------------------------------------------

/**
 * Gear slot identifiers.
 *
 * - `accessory`   — generic accessory slot
 * - `accessory-H` — helmet accessory (max 1 per loadout)
 * - `accessory-A` — amulet accessory  (max 1 per loadout)
 */
export type SlotType =
  | "chestplate"
  | "leggings"
  | "accessory"
  | "accessory-H"
  | "accessory-A";

/** A single piece of equipment before any enchantments or modifications. */
export interface EquipmentPiece {
  readonly id: string;
  readonly name: string;
  readonly setName?: string | undefined;
  readonly slot: SlotType;
  readonly baseStats: Partial<Stats>;
  readonly socketCount: number;
  readonly maxLevel: number;
  readonly tags: readonly string[];
  /** When true (or absent), only the Atlantean modifier is allowed. */
  readonly atlanteanOnly?: boolean | undefined;
}

// ---------------------------------------------------------------------------
// Enchantments, Modifiers, Gems
// ---------------------------------------------------------------------------

/** An enchantment that can be applied to armor or accessories. */
export interface Enchantment {
  readonly id: string;
  readonly name: string;
  readonly tier: 1 | 2;
  readonly applicableTo: readonly ("armor" | "accessory")[];
  readonly stats: Partial<Stats>;
  readonly incompatibleWith?: readonly string[] | undefined;
}

/** Atlantean modifier bonus-stat configuration. */
export interface AtlanteanConfig {
  readonly insanity: number;
  readonly possibleBonusStats: readonly StatName[];
}

/** A modifier that can alter equipment stats and behavior. */
export interface Modifier {
  readonly id: string;
  readonly name: string;
  readonly stats: Partial<Stats>;
  readonly grantsSocket?: boolean | undefined;
  readonly atlanteanBehavior?: AtlanteanConfig | undefined;
}

/** A gem that can be socketed into equipment. */
export interface Gem {
  readonly id: string;
  readonly name: string;
  readonly tier: 1 | 2;
  readonly stats: Partial<Stats>;
}

// ---------------------------------------------------------------------------
// Loadout
// ---------------------------------------------------------------------------

/** A single equipped slot with its piece and optional augmentations. */
export interface EquippedSlot {
  readonly piece: EquipmentPiece;
  readonly enchantment?: Enchantment | undefined;
  readonly modifier?: Modifier | undefined;
  readonly gems: readonly Gem[];
}

/**
 * A complete 5-slot loadout.
 *
 * Slot order: chestplate, leggings, accessory, accessory, accessory.
 */
export interface Loadout {
  readonly slots: readonly [
    EquippedSlot,
    EquippedSlot,
    EquippedSlot,
    EquippedSlot,
    EquippedSlot,
  ];
}

// ---------------------------------------------------------------------------
// Constraints
// ---------------------------------------------------------------------------

/** Hard constraints that loadouts must satisfy to be valid. */
export interface HardConstraints {
  readonly maxHelmetAccessories: number;
  readonly maxAmuletAccessories: number;
  readonly totalAccessories: number;
  readonly atlanteanIncompatibleWith: readonly string[];
  readonly maxUnwardedInsanity: number;
  readonly maxDrawback: number;
  readonly noDuplicateItems: boolean;
}

/** The kind of soft constraint applied to a stat. */
export type ConstraintType =
  | "minimize"
  | "maximize"
  | "atLeast"
  | "atMost"
  | "target"
  | "exactly";

/** A weighted objective targeting a specific stat. */
export interface SoftConstraint {
  readonly stat: StatName;
  readonly type: ConstraintType;
  readonly value?: number | undefined;
  readonly weight: number;
  readonly hardCap?: number | undefined;
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

/** The full pool of available gear for search algorithms. */
export interface GearPool {
  readonly chestplates: readonly EquipmentPiece[];
  readonly leggings: readonly EquipmentPiece[];
  readonly accessories: readonly EquipmentPiece[];
  readonly enchantments: readonly Enchantment[];
  readonly modifiers: readonly Modifier[];
  readonly gems: readonly Gem[];
}

/** Enhancement assignment mode for search. */
export type EnhancementMode = "none" | "greedy" | "budget-aware";

/** Configuration options for a search run. */
export interface SearchOptions {
  readonly maxResults: number;
  readonly timeout?: number | undefined;
  readonly enhancementMode?: EnhancementMode | undefined;
  readonly populationSize?: number | undefined;
  readonly generations?: number | undefined;
  readonly mutationRate?: number | undefined;
  readonly crossoverRate?: number | undefined;
}

/** A single search result with its scored loadout. */
export interface SearchResult {
  readonly loadout: Loadout;
  readonly score: number;
  readonly stats: Stats;
  readonly atlanteanChoices?: ReadonlyMap<number, StatName> | undefined;
}

/** A pluggable search strategy that explores the gear space. */
export interface SearchStrategy {
  readonly name: string;
  search(
    gearPool: GearPool,
    constraints: HardConstraints,
    fitness: readonly SoftConstraint[],
    options: SearchOptions,
  ): Promise<readonly SearchResult[]>;
  onProgress?: ((checked: number, total: number, bestScore: number, results: readonly SearchResult[]) => void) | undefined;
}
