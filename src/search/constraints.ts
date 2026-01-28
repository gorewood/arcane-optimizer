/**
 * Hard constraint validation for loadout legality.
 *
 * All functions are pure — no side effects, no mutation.
 * Each validator checks one rule and returns violations.
 */

import type {
  EquippedSlot,
  HardConstraints,
  Loadout,
  StatName,
} from "@/models/types";

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

/** Result of validating a single constraint rule. */
export interface ConstraintViolation {
  readonly rule: string;
  readonly message: string;
  readonly severity: "error";
}

/** Full validation result for a loadout. */
export interface ValidationResult {
  readonly valid: boolean;
  readonly violations: readonly ConstraintViolation[];
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

/** Default hard constraints matching game rules. */
export const DEFAULT_HARD_CONSTRAINTS: HardConstraints = {
  maxHelmetAccessories: 1,
  maxAmuletAccessories: 1,
  totalAccessories: 3,
  atlanteanIncompatibleWith: ["virtuous"],
  noDuplicateItems: true,
};

// ---------------------------------------------------------------------------
// Stat helpers
// ---------------------------------------------------------------------------

/** All stat names for iteration. */
const STAT_NAMES: readonly StatName[] = [
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

/** Sum all stats contributed by a single equipped slot. */
export function computeSlotStats(slot: EquippedSlot): Partial<Stats> {
  const sources: readonly Partial<Stats>[] = [
    slot.piece.baseStats,
    ...(slot.enchantment ? [slot.enchantment.stats] : []),
    ...(slot.modifier ? [slot.modifier.stats] : []),
    ...slot.gems.map((g) => g.stats),
    // Atlantean modifier contributes insanity as a real stat
    ...(slot.modifier?.atlanteanBehavior != null
      ? [{ insanity: slot.modifier.atlanteanBehavior.insanity } as Partial<Stats>]
      : []),
  ];
  return sumStatBlocks(sources);
}

/** Convenience alias — Stats is Record<StatName, number>. */
type Stats = Record<StatName, number>;

/** Sum multiple partial stat blocks into one. */
function sumStatBlocks(
  blocks: readonly Partial<Stats>[],
): Partial<Stats> {
  const result: Partial<Stats> = {};
  for (const name of STAT_NAMES) {
    let total = 0;
    let found = false;
    for (const block of blocks) {
      const val = block[name] ?? 0;
      if (val !== 0) found = true;
      total += val;
    }
    if (found) {
      (result as Record<string, number>)[name] = total;
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Individual rule validators
// ---------------------------------------------------------------------------

function violation(rule: string, message: string): ConstraintViolation {
  return { rule, message, severity: "error" };
}

/** Rule 1: Exactly 1 chestplate, 1 leggings, 3 accessories. */
function checkSlotComposition(
  loadout: Loadout,
  constraints: HardConstraints,
): readonly ConstraintViolation[] {
  const violations: ConstraintViolation[] = [];
  let chestCount = 0;
  let legCount = 0;
  let accCount = 0;
  for (const slot of loadout.slots) {
    const t = slot.piece.slot;
    if (t === "chestplate") chestCount++;
    else if (t === "leggings") legCount++;
    else accCount++;
  }
  if (chestCount !== 1) {
    violations.push(violation("slot-composition", `Expected 1 chestplate, got ${String(chestCount)}`));
  }
  if (legCount !== 1) {
    violations.push(violation("slot-composition", `Expected 1 leggings, got ${String(legCount)}`));
  }
  if (accCount !== constraints.totalAccessories) {
    violations.push(violation("slot-composition", `Expected ${String(constraints.totalAccessories)} accessories, got ${String(accCount)}`));
  }
  return violations;
}

/** Rule 2: At most N helmet accessories. */
function checkHelmetLimit(
  loadout: Loadout,
  constraints: HardConstraints,
): readonly ConstraintViolation[] {
  const count = loadout.slots.filter((s) => s.piece.slot === "accessory-H").length;
  if (count > constraints.maxHelmetAccessories) {
    return [violation("helmet-limit", `Max ${String(constraints.maxHelmetAccessories)} helmet accessory, got ${String(count)}`)];
  }
  return [];
}

/** Rule 3: At most N amulet accessories. */
function checkAmuletLimit(
  loadout: Loadout,
  constraints: HardConstraints,
): readonly ConstraintViolation[] {
  const count = loadout.slots.filter((s) => s.piece.slot === "accessory-A").length;
  if (count > constraints.maxAmuletAccessories) {
    return [violation("amulet-limit", `Max ${String(constraints.maxAmuletAccessories)} amulet accessory, got ${String(count)}`)];
  }
  return [];
}

/** Rule 4: No duplicate equipment piece IDs. */
function checkNoDuplicates(
  loadout: Loadout,
  constraints: HardConstraints,
): readonly ConstraintViolation[] {
  if (!constraints.noDuplicateItems) return [];
  const seen = new Set<string>();
  const violations: ConstraintViolation[] = [];
  for (const slot of loadout.slots) {
    if (seen.has(slot.piece.id)) {
      violations.push(violation("no-duplicates", `Duplicate equipment: ${slot.piece.name} (${slot.piece.id})`));
    }
    seen.add(slot.piece.id);
  }
  return violations;
}

/** Rule 5: Atlantean-incompatible enchantments. */
function checkAtlanteanConflict(
  loadout: Loadout,
  constraints: HardConstraints,
): readonly ConstraintViolation[] {
  const violations: ConstraintViolation[] = [];
  for (const slot of loadout.slots) {
    if (!slot.enchantment || !slot.modifier?.atlanteanBehavior) continue;
    const isIncompat = constraints.atlanteanIncompatibleWith.includes(slot.enchantment.id);
    if (isIncompat) {
      violations.push(
        violation(
          "atlantean-conflict",
          `${slot.enchantment.name} enchantment conflicts with Atlantean modifier on ${slot.piece.name}`,
        ),
      );
    }
  }
  return violations;
}

/** Rule 6: Single enchantment per piece (defense-in-depth). */
function checkSingleEnchantment(
  _loadout: Loadout,
): readonly ConstraintViolation[] {
  // The type system enforces at most 1 enchantment via `enchantment?: Enchantment`.
  // This validator exists for defense-in-depth; nothing to check at runtime.
  return [];
}

/** Rule 7: Gem count respects socket count + bonus. */
function checkGemCount(
  loadout: Loadout,
): readonly ConstraintViolation[] {
  const violations: ConstraintViolation[] = [];
  for (const slot of loadout.slots) {
    const maxGems = slot.piece.socketCount + (slot.modifier?.grantsSocket === true ? 1 : 0);
    if (slot.gems.length > maxGems) {
      violations.push(
        violation("gem-count", `${slot.piece.name} has ${String(slot.gems.length)} gems but max is ${String(maxGems)}`),
      );
    }
  }
  return violations;
}

// Note: Insanity/warding and drawback are no longer hard constraints.
// Users can set soft constraints through the goal system to penalize
// builds that exceed their preferred tolerances for these stats.

// ---------------------------------------------------------------------------
// Main validator
// ---------------------------------------------------------------------------

/**
 * Validate a loadout against hard constraints.
 * Returns detailed results for UI feedback.
 */
export function validateLoadout(
  loadout: Loadout,
  constraints: HardConstraints,
): ValidationResult {
  const violations: readonly ConstraintViolation[] = [
    ...checkSlotComposition(loadout, constraints),
    ...checkHelmetLimit(loadout, constraints),
    ...checkAmuletLimit(loadout, constraints),
    ...checkNoDuplicates(loadout, constraints),
    ...checkAtlanteanConflict(loadout, constraints),
    ...checkSingleEnchantment(loadout),
    ...checkGemCount(loadout),
  ];
  return { valid: violations.length === 0, violations };
}
