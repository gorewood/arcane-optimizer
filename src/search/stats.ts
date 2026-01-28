/**
 * Stats computation engine with Atlantean modifier logic.
 *
 * Builds on top of `computeSlotStats` from constraints.ts, adding
 * Atlantean bonus resolution and full loadout stat aggregation.
 * All functions are pure — no side effects, no mutation.
 */

import type {
  EquippedSlot,
  Loadout,
  StatName,
  Stats,
} from "@/models/types";

import { computeSlotStats, getPieceStats } from "./constraints";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** All 12 stat names for iteration. */
export const STAT_NAMES: readonly StatName[] = [
  "power",
  "defense",
  "size",
  "dexterity",
  "range",
  "haste",
  "insanity",
  "warding",
  "drawback",
  "regeneration",
  "pierce",
  "resistance",
];

/** Fixed bonus values an Atlantean modifier grants per stat. */
export const ATLANTEAN_BONUS_VALUES: Readonly<Record<StatName, number>> = {
  power: 13,
  defense: 116,
  size: 38,
  dexterity: 38,
  range: 38,
  haste: 38,
  insanity: 0,
  warding: 0,
  drawback: 0,
  regeneration: 0,
  pierce: 0,
  resistance: 0,
};

// ---------------------------------------------------------------------------
// Core stat functions
// ---------------------------------------------------------------------------

/** Create a zeroed Stats object (all 12 stats = 0). */
export function emptyStats(): Stats {
  return {
    power: 0,
    defense: 0,
    size: 0,
    dexterity: 0,
    range: 0,
    haste: 0,
    insanity: 0,
    warding: 0,
    drawback: 0,
    regeneration: 0,
    pierce: 0,
    resistance: 0,
  };
}

/** Sum multiple Partial<Stats> blocks into a full Stats object. */
export function sumStats(...blocks: readonly Partial<Stats>[]): Stats {
  const result = emptyStats();
  for (const block of blocks) {
    for (const name of STAT_NAMES) {
      result[name] += block[name] ?? 0;
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Atlantean logic
// ---------------------------------------------------------------------------

/** Check whether a stat has a non-zero value in a partial stat block. */
function hasNonZeroStat(block: Partial<Stats>, name: StatName): boolean {
  return (block[name] ?? 0) !== 0;
}

/**
 * Get which stats are valid Atlantean bonus targets for a slot.
 *
 * A stat is valid if it appears in the modifier's `possibleBonusStats`
 * AND is NOT already applied (non-zero) by the piece's effective stats
 * (base + variant), any socketed gem, or the enchantment.
 */
export function getValidAtlanteanChoices(
  slot: EquippedSlot,
): readonly StatName[] {
  const config = slot.modifier?.atlanteanBehavior;
  if (config == null) return [];

  const pieceStats = getPieceStats(slot.piece);
  return config.possibleBonusStats.filter((stat) => {
    if (hasNonZeroStat(pieceStats, stat)) return false;
    if (slot.enchantment != null && hasNonZeroStat(slot.enchantment.stats, stat)) return false;
    return !slot.gems.some((gem) => hasNonZeroStat(gem.stats, stat));
  });
}

/**
 * Get the deterministic Atlantean bonus stat for a slot.
 *
 * The game assigns the first stat from the priority list that isn't
 * already applied by the item's base stats, enchantment, or gems.
 * Returns null if no valid stat is available.
 */
export function getAtlanteanBonusStat(
  slot: EquippedSlot,
): StatName | null {
  const choices = getValidAtlanteanChoices(slot);
  return choices[0] ?? null;
}

/**
 * Resolve the Atlantean modifier bonus for a given slot.
 *
 * Returns a Partial<Stats> with the bonus value for the chosen stat,
 * or an empty object if no atlantean behavior or choice is null.
 */
export function resolveAtlanteanBonus(
  slot: EquippedSlot,
  atlanteanChoice: StatName | null,
): Partial<Stats> {
  if (atlanteanChoice == null) return {};
  if (slot.modifier?.atlanteanBehavior == null) return {};

  const bonusValue = ATLANTEAN_BONUS_VALUES[atlanteanChoice];
  if (bonusValue === 0) return {};

  return { [atlanteanChoice]: bonusValue };
}

// ---------------------------------------------------------------------------
// Loadout computation
// ---------------------------------------------------------------------------

/**
 * Compute total stats for a complete loadout.
 *
 * For each slot: sums base+enchantment+modifier+gem stats via
 * `computeSlotStats`, then adds Atlantean bonuses if applicable.
 */
export function computeLoadoutStats(
  loadout: Loadout,
  atlanteanChoices?: ReadonlyMap<number, StatName>,
): Stats {
  const slotBlocks: Partial<Stats>[] = [];

  for (let i = 0; i < loadout.slots.length; i++) {
    const slot = loadout.slots[i];
    if (slot == null) continue;

    slotBlocks.push(computeSlotStats(slot));

    if (slot.modifier?.atlanteanBehavior != null) {
      const choice = atlanteanChoices?.get(i) ?? null;
      slotBlocks.push(resolveAtlanteanBonus(slot, choice));
    }
  }

  return sumStats(...slotBlocks);
}
