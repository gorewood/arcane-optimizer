import { describe, expect, it } from "vitest";

import type {
  Enchantment,
  EquipmentPiece,
  EquippedSlot,
  Gem,
  Loadout,
  Modifier,
  StatName,
} from "@/models/types";

import {
  ATLANTEAN_BONUS_VALUES,
  computeLoadoutStats,
  emptyStats,
  getValidAtlanteanChoices,
  resolveAtlanteanBonus,
  STAT_NAMES,
  sumStats,
} from "./stats";

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

function makeAtlanteanModifier(
  possibleBonusStats: readonly StatName[],
  overrides: Partial<Modifier> = {},
): Modifier {
  return makeModifier({
    id: "atlantean",
    name: "Atlantean",
    stats: {},
    atlanteanBehavior: {
      insanity: 1,
      possibleBonusStats,
    },
    ...overrides,
  });
}

// ---------------------------------------------------------------------------
// emptyStats
// ---------------------------------------------------------------------------

describe("emptyStats", () => {
  it("returns a Stats object with all 12 values at 0", () => {
    const stats = emptyStats();
    for (const name of STAT_NAMES) {
      expect(stats[name]).toBe(0);
    }
  });

  it("has exactly 12 keys", () => {
    const stats = emptyStats();
    expect(Object.keys(stats)).toHaveLength(12);
  });
});

// ---------------------------------------------------------------------------
// sumStats
// ---------------------------------------------------------------------------

describe("sumStats", () => {
  it("sums multiple partial blocks correctly", () => {
    const result = sumStats(
      { power: 10, defense: 5 },
      { power: 3, size: 4 },
      { defense: 2, dexterity: 7 },
    );
    expect(result.power).toBe(13);
    expect(result.defense).toBe(7);
    expect(result.size).toBe(4);
    expect(result.dexterity).toBe(7);
    // Unmentioned stats default to 0
    expect(result.haste).toBe(0);
    expect(result.insanity).toBe(0);
  });

  it("handles negative stat values", () => {
    // Sopharagos-style negative defense
    const result = sumStats(
      { defense: 100 },
      { defense: -30, power: 15 },
    );
    expect(result.defense).toBe(70);
    expect(result.power).toBe(15);
  });

  it("returns zeroed stats when called with no arguments", () => {
    const result = sumStats();
    for (const name of STAT_NAMES) {
      expect(result[name]).toBe(0);
    }
  });

  it("returns zeroed stats for empty partial blocks", () => {
    const result = sumStats({}, {});
    for (const name of STAT_NAMES) {
      expect(result[name]).toBe(0);
    }
  });
});

// ---------------------------------------------------------------------------
// getValidAtlanteanChoices
// ---------------------------------------------------------------------------

describe("getValidAtlanteanChoices", () => {
  it("returns only stats not present on base item or gems", () => {
    const slot = makeSlot({
      piece: makeEquipment({ baseStats: { power: 10, defense: 5 } }),
      modifier: makeAtlanteanModifier(["power", "defense", "size", "dexterity"]),
      gems: [makeGem({ stats: { size: 3 } })],
    });

    const choices = getValidAtlanteanChoices(slot);
    // power excluded (base), defense excluded (base), size excluded (gem)
    expect(choices).toEqual(["dexterity"]);
  });

  it("returns empty when all possible stats are covered", () => {
    const slot = makeSlot({
      piece: makeEquipment({ baseStats: { power: 10, defense: 5 } }),
      modifier: makeAtlanteanModifier(["power", "defense"]),
      gems: [],
    });

    const choices = getValidAtlanteanChoices(slot);
    expect(choices).toEqual([]);
  });

  it("returns all possible stats when none are covered", () => {
    const slot = makeSlot({
      piece: makeEquipment({ baseStats: { insanity: 1 } }),
      modifier: makeAtlanteanModifier(["power", "defense", "size"]),
      gems: [],
    });

    const choices = getValidAtlanteanChoices(slot);
    expect(choices).toEqual(["power", "defense", "size"]);
  });

  it("returns empty when slot has no atlantean modifier", () => {
    const slot = makeSlot({
      piece: makeEquipment({ baseStats: { power: 10 } }),
      modifier: makeModifier({ stats: { defense: 5 } }),
    });

    const choices = getValidAtlanteanChoices(slot);
    expect(choices).toEqual([]);
  });

  it("returns empty when slot has no modifier at all", () => {
    const slot = makeSlot({
      piece: makeEquipment({ baseStats: { power: 10 } }),
    });

    const choices = getValidAtlanteanChoices(slot);
    expect(choices).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// resolveAtlanteanBonus
// ---------------------------------------------------------------------------

describe("resolveAtlanteanBonus", () => {
  it("returns correct bonus value for each eligible stat", () => {
    const slot = makeSlot({
      piece: makeEquipment({ baseStats: {} }),
      modifier: makeAtlanteanModifier(["power", "defense", "size", "dexterity", "range", "haste"]),
    });

    expect(resolveAtlanteanBonus(slot, "power")).toEqual({ power: 13 });
    expect(resolveAtlanteanBonus(slot, "defense")).toEqual({ defense: 116 });
    expect(resolveAtlanteanBonus(slot, "size")).toEqual({ size: 38 });
    expect(resolveAtlanteanBonus(slot, "dexterity")).toEqual({ dexterity: 38 });
    expect(resolveAtlanteanBonus(slot, "range")).toEqual({ range: 38 });
    expect(resolveAtlanteanBonus(slot, "haste")).toEqual({ haste: 38 });
  });

  it("returns empty object when choice is null", () => {
    const slot = makeSlot({
      piece: makeEquipment({ baseStats: {} }),
      modifier: makeAtlanteanModifier(["power", "defense"]),
    });

    expect(resolveAtlanteanBonus(slot, null)).toEqual({});
  });

  it("returns empty when slot has no atlantean modifier", () => {
    const slot = makeSlot({
      piece: makeEquipment({ baseStats: {} }),
      modifier: makeModifier({ stats: { power: 5 } }),
    });

    expect(resolveAtlanteanBonus(slot, "defense")).toEqual({});
  });

  it("returns empty for zero-bonus stats like insanity", () => {
    const slot = makeSlot({
      piece: makeEquipment({ baseStats: {} }),
      modifier: makeAtlanteanModifier(["insanity"]),
    });

    expect(resolveAtlanteanBonus(slot, "insanity")).toEqual({});
  });

  it("returns empty when no modifier present", () => {
    const slot = makeSlot({
      piece: makeEquipment({ baseStats: {} }),
    });

    expect(resolveAtlanteanBonus(slot, "power")).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// computeLoadoutStats
// ---------------------------------------------------------------------------

describe("computeLoadoutStats", () => {
  it("sums 5 slots with no modifiers or enchantments", () => {
    const loadout = makeLoadout([
      makeSlot({
        piece: makeEquipment({ id: "c1", slot: "chestplate", baseStats: { defense: 100 } }),
      }),
      makeSlot({
        piece: makeEquipment({ id: "l1", slot: "leggings", baseStats: { defense: 80 } }),
      }),
      makeSlot({
        piece: makeEquipment({ id: "a1", slot: "accessory", baseStats: { power: 10 } }),
      }),
      makeSlot({
        piece: makeEquipment({ id: "a2", slot: "accessory-H", baseStats: { defense: 20 } }),
      }),
      makeSlot({
        piece: makeEquipment({ id: "a3", slot: "accessory-A", baseStats: { power: 5 } }),
      }),
    ]);

    const stats = computeLoadoutStats(loadout);
    expect(stats.defense).toBe(200); // 100 + 80 + 20
    expect(stats.power).toBe(15);    // 10 + 5
    expect(stats.size).toBe(0);
  });

  it("includes enchantment stats", () => {
    const loadout = makeLoadout([
      makeSlot({
        piece: makeEquipment({ id: "c1", slot: "chestplate", baseStats: { defense: 50 } }),
        enchantment: makeEnchantment({ stats: { defense: 30, power: 5 } }),
      }),
      makeSlot({
        piece: makeEquipment({ id: "l1", slot: "leggings", baseStats: { defense: 40 } }),
        enchantment: makeEnchantment({ stats: { defense: 20 } }),
      }),
      makeSlot({ piece: makeEquipment({ id: "a1", slot: "accessory" }) }),
      makeSlot({ piece: makeEquipment({ id: "a2", slot: "accessory-H" }) }),
      makeSlot({ piece: makeEquipment({ id: "a3", slot: "accessory-A" }) }),
    ]);

    const stats = computeLoadoutStats(loadout);
    expect(stats.defense).toBe(140); // 50 + 30 + 40 + 20
    expect(stats.power).toBe(5);
  });

  it("includes gem stats", () => {
    const loadout = makeLoadout([
      makeSlot({
        piece: makeEquipment({ id: "c1", slot: "chestplate", baseStats: { defense: 50 } }),
        gems: [
          makeGem({ id: "g1", stats: { defense: 10 } }),
          makeGem({ id: "g2", stats: { power: 3 } }),
        ],
      }),
      makeSlot({
        piece: makeEquipment({ id: "l1", slot: "leggings", baseStats: { defense: 40 } }),
        gems: [makeGem({ id: "g3", stats: { defense: 10 } })],
      }),
      makeSlot({ piece: makeEquipment({ id: "a1", slot: "accessory" }) }),
      makeSlot({ piece: makeEquipment({ id: "a2", slot: "accessory-H" }) }),
      makeSlot({ piece: makeEquipment({ id: "a3", slot: "accessory-A" }) }),
    ]);

    const stats = computeLoadoutStats(loadout);
    expect(stats.defense).toBe(110); // 50 + 10 + 40 + 10
    expect(stats.power).toBe(3);
  });

  it("applies Atlantean bonus for chosen stat", () => {
    const loadout = makeLoadout([
      makeSlot({
        piece: makeEquipment({ id: "c1", slot: "chestplate", baseStats: { defense: 50 } }),
        modifier: makeAtlanteanModifier(["power", "size", "dexterity"]),
      }),
      makeSlot({
        piece: makeEquipment({ id: "l1", slot: "leggings", baseStats: { defense: 40 } }),
      }),
      makeSlot({ piece: makeEquipment({ id: "a1", slot: "accessory" }) }),
      makeSlot({ piece: makeEquipment({ id: "a2", slot: "accessory-H" }) }),
      makeSlot({ piece: makeEquipment({ id: "a3", slot: "accessory-A" }) }),
    ]);

    const choices = new Map<number, StatName>([[0, "power"]]);
    const stats = computeLoadoutStats(loadout, choices);

    // defense: 50 + 40 = 90
    expect(stats.defense).toBe(90);
    // power: 0 + atlantean bonus 13 = 13
    expect(stats.power).toBe(13);
    // modifier's own insanity: 1
    expect(stats.insanity).toBe(1);
  });

  it("does not apply Atlantean bonus when no choice provided", () => {
    const loadout = makeLoadout([
      makeSlot({
        piece: makeEquipment({ id: "c1", slot: "chestplate", baseStats: { defense: 50 } }),
        modifier: makeAtlanteanModifier(["power", "size"]),
      }),
      makeSlot({
        piece: makeEquipment({ id: "l1", slot: "leggings", baseStats: { defense: 40 } }),
      }),
      makeSlot({ piece: makeEquipment({ id: "a1", slot: "accessory" }) }),
      makeSlot({ piece: makeEquipment({ id: "a2", slot: "accessory-H" }) }),
      makeSlot({ piece: makeEquipment({ id: "a3", slot: "accessory-A" }) }),
    ]);

    const stats = computeLoadoutStats(loadout);
    expect(stats.defense).toBe(90);
    expect(stats.power).toBe(0);
    // modifier insanity still counted
    expect(stats.insanity).toBe(1);
  });

  it("handles multiple Atlantean modifiers across slots", () => {
    const loadout = makeLoadout([
      makeSlot({
        piece: makeEquipment({ id: "c1", slot: "chestplate", baseStats: { defense: 50 } }),
        modifier: makeAtlanteanModifier(["power", "size"]),
      }),
      makeSlot({
        piece: makeEquipment({ id: "l1", slot: "leggings", baseStats: { defense: 40 } }),
        modifier: makeAtlanteanModifier(["power", "dexterity"]),
      }),
      makeSlot({ piece: makeEquipment({ id: "a1", slot: "accessory" }) }),
      makeSlot({ piece: makeEquipment({ id: "a2", slot: "accessory-H" }) }),
      makeSlot({ piece: makeEquipment({ id: "a3", slot: "accessory-A" }) }),
    ]);

    const choices = new Map<number, StatName>([
      [0, "size"],
      [1, "dexterity"],
    ]);
    const stats = computeLoadoutStats(loadout, choices);

    expect(stats.defense).toBe(90);
    expect(stats.size).toBe(38);
    expect(stats.dexterity).toBe(38);
    expect(stats.insanity).toBe(2); // 1 from each atlantean modifier
  });

  it("computes known Sunken Iron build correctly", () => {
    // Sunken Iron is a defense-focused set from Arcane Odyssey.
    // Using approximate values for a realistic test.
    const sunkenIronArmor = makeEquipment({
      id: "sunken-iron-armor",
      name: "Sunken Iron Armor",
      slot: "chestplate",
      baseStats: { defense: 216, power: 28 },
      socketCount: 2,
    });

    const sunkenIronGreaves = makeEquipment({
      id: "sunken-iron-greaves",
      name: "Sunken Iron Greaves",
      slot: "leggings",
      baseStats: { defense: 162, power: 21 },
      socketCount: 2,
    });

    const defenseAmulet = makeEquipment({
      id: "defense-amulet",
      name: "Defense Amulet",
      slot: "accessory-A",
      baseStats: { defense: 72 },
      socketCount: 1,
    });

    const helmet = makeEquipment({
      id: "iron-helmet",
      name: "Iron Helmet",
      slot: "accessory-H",
      baseStats: { defense: 48 },
      socketCount: 1,
    });

    const ring = makeEquipment({
      id: "defense-ring",
      name: "Defense Ring",
      slot: "accessory",
      baseStats: { defense: 36 },
      socketCount: 1,
    });

    const hardEnchant = makeEnchantment({
      id: "hard",
      name: "Hard",
      stats: { defense: 72 },
    });

    const defenseGem = makeGem({
      id: "defense-gem-t2",
      name: "Defense Gem T2",
      tier: 2,
      stats: { defense: 24 },
    });

    const loadout = makeLoadout([
      makeSlot({
        piece: sunkenIronArmor,
        enchantment: hardEnchant,
        gems: [defenseGem, defenseGem],
      }),
      makeSlot({
        piece: sunkenIronGreaves,
        enchantment: hardEnchant,
        gems: [defenseGem, defenseGem],
      }),
      makeSlot({
        piece: ring,
        enchantment: hardEnchant,
        gems: [defenseGem],
      }),
      makeSlot({
        piece: helmet,
        enchantment: hardEnchant,
        gems: [defenseGem],
      }),
      makeSlot({
        piece: defenseAmulet,
        enchantment: hardEnchant,
        gems: [defenseGem],
      }),
    ]);

    const stats = computeLoadoutStats(loadout);

    // Expected defense breakdown:
    // Armor: 216 + 72 + 24 + 24 = 336
    // Greaves: 162 + 72 + 24 + 24 = 282
    // Ring: 36 + 72 + 24 = 132
    // Helmet: 48 + 72 + 24 = 144
    // Amulet: 72 + 72 + 24 = 168
    // Total: 336 + 282 + 132 + 144 + 168 = 1062
    expect(stats.defense).toBe(1062);

    // Power from Sunken Iron set only
    expect(stats.power).toBe(49); // 28 + 21

    // Everything else should be 0
    expect(stats.size).toBe(0);
    expect(stats.haste).toBe(0);
    expect(stats.insanity).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// STAT_NAMES and ATLANTEAN_BONUS_VALUES sanity checks
// ---------------------------------------------------------------------------

describe("STAT_NAMES", () => {
  it("contains exactly 12 stat names", () => {
    expect(STAT_NAMES).toHaveLength(12);
  });

  it("has no duplicates", () => {
    const unique = new Set(STAT_NAMES);
    expect(unique.size).toBe(12);
  });
});

describe("ATLANTEAN_BONUS_VALUES", () => {
  it("has non-zero values for the 6 primary/secondary stats", () => {
    expect(ATLANTEAN_BONUS_VALUES.power).toBe(13);
    expect(ATLANTEAN_BONUS_VALUES.defense).toBe(116);
    expect(ATLANTEAN_BONUS_VALUES.size).toBe(38);
    expect(ATLANTEAN_BONUS_VALUES.dexterity).toBe(38);
    expect(ATLANTEAN_BONUS_VALUES.range).toBe(38);
    expect(ATLANTEAN_BONUS_VALUES.haste).toBe(38);
  });

  it("has zero values for the 6 special stats", () => {
    expect(ATLANTEAN_BONUS_VALUES.insanity).toBe(0);
    expect(ATLANTEAN_BONUS_VALUES.warding).toBe(0);
    expect(ATLANTEAN_BONUS_VALUES.drawback).toBe(0);
    expect(ATLANTEAN_BONUS_VALUES.regeneration).toBe(0);
    expect(ATLANTEAN_BONUS_VALUES.pierce).toBe(0);
    expect(ATLANTEAN_BONUS_VALUES.resistance).toBe(0);
  });
});
