import { describe, expect, it } from "vitest";

import type {
  Enchantment,
  EquipmentPiece,
  EquippedSlot,
  Gem,
  HardConstraints,
  Loadout,
  Modifier,
} from "@/models/types";

import {
  computeSlotStats,
  DEFAULT_HARD_CONSTRAINTS,
  validateLoadout,
} from "./constraints";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeEquipment(overrides: Partial<EquipmentPiece> = {}): EquipmentPiece {
  return {
    id: "equip-1",
    name: "Test Piece",
    slot: "chestplate",
    baseStats: {},
    socketCount: 2,
    maxLevel: 120,
    tags: [],
    ...overrides,
  };
}

function makeSlot(overrides: Partial<EquippedSlot> = {}): EquippedSlot {
  return {
    piece: makeEquipment(),
    gems: [],
    ...overrides,
  };
}

function makeLoadout(
  slots: [EquippedSlot, EquippedSlot, EquippedSlot, EquippedSlot, EquippedSlot],
): Loadout {
  return { slots };
}

/** Build a standard valid loadout: 1 chest, 1 legs, 3 accessories. */
function validLoadout(): Loadout {
  return makeLoadout([
    makeSlot({ piece: makeEquipment({ id: "chest-1", slot: "chestplate" }) }),
    makeSlot({ piece: makeEquipment({ id: "legs-1", slot: "leggings" }) }),
    makeSlot({ piece: makeEquipment({ id: "acc-1", slot: "accessory" }) }),
    makeSlot({ piece: makeEquipment({ id: "acc-2", slot: "accessory-H" }) }),
    makeSlot({ piece: makeEquipment({ id: "acc-3", slot: "accessory-A" }) }),
  ]);
}

function makeGem(overrides: Partial<Gem> = {}): Gem {
  return {
    id: "gem-1",
    name: "Test Gem",
    tier: 1,
    stats: {},
    ...overrides,
  };
}

function makeEnchantment(overrides: Partial<Enchantment> = {}): Enchantment {
  return {
    id: "ench-1",
    name: "Test Enchantment",
    tier: 1,
    applicableTo: ["armor"],
    stats: {},
    ...overrides,
  };
}

function makeModifier(overrides: Partial<Modifier> = {}): Modifier {
  return {
    id: "mod-1",
    name: "Test Modifier",
    stats: {},
    ...overrides,
  };
}

const defaults = DEFAULT_HARD_CONSTRAINTS;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("validateLoadout", () => {
  it("accepts a valid loadout", () => {
    const result = validateLoadout(validLoadout(), defaults);
    expect(result.valid).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  // ---- Rule 1: Slot composition ----

  describe("slot composition", () => {
    it("rejects loadout with two chestplates", () => {
      const loadout = makeLoadout([
        makeSlot({ piece: makeEquipment({ id: "c1", slot: "chestplate" }) }),
        makeSlot({ piece: makeEquipment({ id: "c2", slot: "chestplate" }) }),
        makeSlot({ piece: makeEquipment({ id: "a1", slot: "accessory" }) }),
        makeSlot({ piece: makeEquipment({ id: "a2", slot: "accessory" }) }),
        makeSlot({ piece: makeEquipment({ id: "a3", slot: "accessory" }) }),
      ]);
      const result = validateLoadout(loadout, defaults);
      expect(result.valid).toBe(false);
      expect(result.violations.some((v) => v.rule === "slot-composition")).toBe(true);
    });

    it("rejects loadout missing leggings", () => {
      const loadout = makeLoadout([
        makeSlot({ piece: makeEquipment({ id: "c1", slot: "chestplate" }) }),
        makeSlot({ piece: makeEquipment({ id: "a0", slot: "accessory" }) }),
        makeSlot({ piece: makeEquipment({ id: "a1", slot: "accessory" }) }),
        makeSlot({ piece: makeEquipment({ id: "a2", slot: "accessory" }) }),
        makeSlot({ piece: makeEquipment({ id: "a3", slot: "accessory" }) }),
      ]);
      const result = validateLoadout(loadout, defaults);
      expect(result.valid).toBe(false);
      const slotViolations = result.violations.filter((v) => v.rule === "slot-composition");
      expect(slotViolations.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ---- Rule 2: Helmet limit ----

  describe("helmet limit", () => {
    it("rejects two helmet accessories", () => {
      const loadout = makeLoadout([
        makeSlot({ piece: makeEquipment({ id: "c1", slot: "chestplate" }) }),
        makeSlot({ piece: makeEquipment({ id: "l1", slot: "leggings" }) }),
        makeSlot({ piece: makeEquipment({ id: "h1", slot: "accessory-H" }) }),
        makeSlot({ piece: makeEquipment({ id: "h2", slot: "accessory-H" }) }),
        makeSlot({ piece: makeEquipment({ id: "a1", slot: "accessory" }) }),
      ]);
      const result = validateLoadout(loadout, defaults);
      expect(result.valid).toBe(false);
      expect(result.violations.some((v) => v.rule === "helmet-limit")).toBe(true);
    });

    it("accepts one helmet accessory", () => {
      const result = validateLoadout(validLoadout(), defaults);
      expect(result.violations.some((v) => v.rule === "helmet-limit")).toBe(false);
    });
  });

  // ---- Rule 3: Amulet limit ----

  describe("amulet limit", () => {
    it("rejects two amulet accessories", () => {
      const loadout = makeLoadout([
        makeSlot({ piece: makeEquipment({ id: "c1", slot: "chestplate" }) }),
        makeSlot({ piece: makeEquipment({ id: "l1", slot: "leggings" }) }),
        makeSlot({ piece: makeEquipment({ id: "am1", slot: "accessory-A" }) }),
        makeSlot({ piece: makeEquipment({ id: "am2", slot: "accessory-A" }) }),
        makeSlot({ piece: makeEquipment({ id: "a1", slot: "accessory" }) }),
      ]);
      const result = validateLoadout(loadout, defaults);
      expect(result.valid).toBe(false);
      expect(result.violations.some((v) => v.rule === "amulet-limit")).toBe(true);
    });

    it("accepts one amulet accessory", () => {
      const result = validateLoadout(validLoadout(), defaults);
      expect(result.violations.some((v) => v.rule === "amulet-limit")).toBe(false);
    });
  });

  // ---- Rule 4: No duplicate items ----

  describe("no duplicates", () => {
    it("rejects duplicate equipment IDs", () => {
      const loadout = makeLoadout([
        makeSlot({ piece: makeEquipment({ id: "same-id", slot: "chestplate" }) }),
        makeSlot({ piece: makeEquipment({ id: "l1", slot: "leggings" }) }),
        makeSlot({ piece: makeEquipment({ id: "same-id", slot: "accessory" }) }),
        makeSlot({ piece: makeEquipment({ id: "a2", slot: "accessory-H" }) }),
        makeSlot({ piece: makeEquipment({ id: "a3", slot: "accessory-A" }) }),
      ]);
      const result = validateLoadout(loadout, defaults);
      expect(result.valid).toBe(false);
      expect(result.violations.some((v) => v.rule === "no-duplicates")).toBe(true);
    });

    it("allows duplicates when noDuplicateItems is false", () => {
      const loadout = makeLoadout([
        makeSlot({ piece: makeEquipment({ id: "same-id", slot: "chestplate" }) }),
        makeSlot({ piece: makeEquipment({ id: "l1", slot: "leggings" }) }),
        makeSlot({ piece: makeEquipment({ id: "same-id", slot: "accessory" }) }),
        makeSlot({ piece: makeEquipment({ id: "a2", slot: "accessory-H" }) }),
        makeSlot({ piece: makeEquipment({ id: "a3", slot: "accessory-A" }) }),
      ]);
      const relaxed: HardConstraints = { ...defaults, noDuplicateItems: false };
      const result = validateLoadout(loadout, relaxed);
      expect(result.violations.some((v) => v.rule === "no-duplicates")).toBe(false);
    });
  });

  // ---- Rule 5: Atlantean conflict ----

  describe("atlantean conflict", () => {
    it("rejects virtuous enchantment with atlantean modifier", () => {
      const loadout = makeLoadout([
        makeSlot({
          piece: makeEquipment({ id: "c1", slot: "chestplate" }),
          enchantment: makeEnchantment({ id: "virtuous", name: "Virtuous" }),
          modifier: makeModifier({
            id: "atl-1",
            name: "Atlantean",
            atlanteanBehavior: { insanity: 5, possibleBonusStats: ["power"] },
          }),
        }),
        makeSlot({ piece: makeEquipment({ id: "l1", slot: "leggings" }) }),
        makeSlot({ piece: makeEquipment({ id: "a1", slot: "accessory" }) }),
        makeSlot({ piece: makeEquipment({ id: "a2", slot: "accessory-H" }) }),
        makeSlot({ piece: makeEquipment({ id: "a3", slot: "accessory-A" }) }),
      ]);
      const result = validateLoadout(loadout, defaults);
      expect(result.valid).toBe(false);
      expect(result.violations.some((v) => v.rule === "atlantean-conflict")).toBe(true);
    });

    it("allows non-conflicting enchantment with atlantean modifier", () => {
      const loadout = makeLoadout([
        makeSlot({
          piece: makeEquipment({ id: "c1", slot: "chestplate" }),
          enchantment: makeEnchantment({ id: "hard", name: "Hard" }),
          modifier: makeModifier({
            id: "atl-1",
            name: "Atlantean",
            atlanteanBehavior: { insanity: 5, possibleBonusStats: ["power"] },
          }),
        }),
        makeSlot({ piece: makeEquipment({ id: "l1", slot: "leggings" }) }),
        makeSlot({ piece: makeEquipment({ id: "a1", slot: "accessory" }) }),
        makeSlot({ piece: makeEquipment({ id: "a2", slot: "accessory-H" }) }),
        makeSlot({ piece: makeEquipment({ id: "a3", slot: "accessory-A" }) }),
      ]);
      const result = validateLoadout(loadout, defaults);
      expect(result.violations.some((v) => v.rule === "atlantean-conflict")).toBe(false);
    });
  });

  // ---- Rule 7: Gem count ----

  describe("gem count", () => {
    it("rejects too many gems for socket count", () => {
      const loadout = makeLoadout([
        makeSlot({
          piece: makeEquipment({ id: "c1", slot: "chestplate", socketCount: 1 }),
          gems: [makeGem({ id: "g1" }), makeGem({ id: "g2" }), makeGem({ id: "g3" })],
        }),
        makeSlot({ piece: makeEquipment({ id: "l1", slot: "leggings" }) }),
        makeSlot({ piece: makeEquipment({ id: "a1", slot: "accessory" }) }),
        makeSlot({ piece: makeEquipment({ id: "a2", slot: "accessory-H" }) }),
        makeSlot({ piece: makeEquipment({ id: "a3", slot: "accessory-A" }) }),
      ]);
      const result = validateLoadout(loadout, defaults);
      expect(result.valid).toBe(false);
      expect(result.violations.some((v) => v.rule === "gem-count")).toBe(true);
    });

    it("accepts gems at exact socket count", () => {
      const loadout = makeLoadout([
        makeSlot({
          piece: makeEquipment({ id: "c1", slot: "chestplate", socketCount: 2 }),
          gems: [makeGem({ id: "g1" }), makeGem({ id: "g2" })],
        }),
        makeSlot({ piece: makeEquipment({ id: "l1", slot: "leggings" }) }),
        makeSlot({ piece: makeEquipment({ id: "a1", slot: "accessory" }) }),
        makeSlot({ piece: makeEquipment({ id: "a2", slot: "accessory-H" }) }),
        makeSlot({ piece: makeEquipment({ id: "a3", slot: "accessory-A" }) }),
      ]);
      const result = validateLoadout(loadout, defaults);
      expect(result.violations.some((v) => v.rule === "gem-count")).toBe(false);
    });

    it("accounts for modifier granting extra socket", () => {
      const loadout = makeLoadout([
        makeSlot({
          piece: makeEquipment({ id: "c1", slot: "chestplate", socketCount: 1 }),
          modifier: makeModifier({ id: "m1", grantsSocket: true }),
          gems: [makeGem({ id: "g1" }), makeGem({ id: "g2" })],
        }),
        makeSlot({ piece: makeEquipment({ id: "l1", slot: "leggings" }) }),
        makeSlot({ piece: makeEquipment({ id: "a1", slot: "accessory" }) }),
        makeSlot({ piece: makeEquipment({ id: "a2", slot: "accessory-H" }) }),
        makeSlot({ piece: makeEquipment({ id: "a3", slot: "accessory-A" }) }),
      ]);
      const result = validateLoadout(loadout, defaults);
      expect(result.violations.some((v) => v.rule === "gem-count")).toBe(false);
    });
  });

  // Note: Insanity/warding and drawback are no longer hard constraints.
  // Users control these through soft constraints in the goal system.

  // ---- Multiple violations ----

  describe("multiple violations", () => {
    it("reports all violations simultaneously", () => {
      const loadout = makeLoadout([
        makeSlot({
          piece: makeEquipment({ id: "same", slot: "chestplate" }),
          gems: [makeGem({ id: "g1" }), makeGem({ id: "g2" }), makeGem({ id: "g3" })],
        }),
        makeSlot({ piece: makeEquipment({ id: "same", slot: "chestplate" }) }),
        makeSlot({ piece: makeEquipment({ id: "a1", slot: "accessory-H" }) }),
        makeSlot({ piece: makeEquipment({ id: "a2", slot: "accessory-H" }) }),
        makeSlot({ piece: makeEquipment({ id: "a3", slot: "accessory-A" }) }),
      ]);
      const result = validateLoadout(loadout, defaults);
      expect(result.valid).toBe(false);
      const rules = new Set(result.violations.map((v) => v.rule));
      // slot-composition (2 chests, 0 legs, wrong acc count)
      expect(rules.has("slot-composition")).toBe(true);
      // no-duplicates (same ID)
      expect(rules.has("no-duplicates")).toBe(true);
      // helmet-limit (2 helmet accessories)
      expect(rules.has("helmet-limit")).toBe(true);
      // gem-count (3 gems, 2 sockets)
      expect(rules.has("gem-count")).toBe(true);
      expect(result.violations.length).toBeGreaterThanOrEqual(4);
    });
  });
});

// ---------------------------------------------------------------------------
// computeSlotStats
// ---------------------------------------------------------------------------

describe("computeSlotStats", () => {
  it("sums base stats only when no augmentations", () => {
    const slot = makeSlot({
      piece: makeEquipment({ baseStats: { power: 10, defense: 5 } }),
    });
    const stats = computeSlotStats(slot);
    expect(stats.power).toBe(10);
    expect(stats.defense).toBe(5);
  });

  it("sums base stats, enchantment, modifier, and gems", () => {
    const slot: EquippedSlot = {
      piece: makeEquipment({ baseStats: { power: 10 } }),
      enchantment: makeEnchantment({ stats: { power: 3, defense: 2 } }),
      modifier: makeModifier({ stats: { power: 1, size: 4 } }),
      gems: [
        makeGem({ stats: { power: 2 } }),
        makeGem({ stats: { defense: 1 } }),
      ],
    };
    const stats = computeSlotStats(slot);
    expect(stats.power).toBe(16); // 10 + 3 + 1 + 2
    expect(stats.defense).toBe(3); // 2 + 1
    expect(stats.size).toBe(4);
  });

  it("returns empty partial when no stats present", () => {
    const slot = makeSlot({
      piece: makeEquipment({ baseStats: {} }),
    });
    const stats = computeSlotStats(slot);
    expect(stats.power).toBeUndefined();
  });
});
