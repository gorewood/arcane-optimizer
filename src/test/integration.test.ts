/**
 * Integration tests — full pipeline from data loading through search.
 *
 * Covers: data loading, stats computation, constraint validation,
 * fitness scoring, exhaustive search, and Atlantean modifier logic.
 */

import { describe, expect, it } from "vitest";

import type {
  Enchantment,
  EquipmentPiece,
  EquippedSlot,
  Gem,
  GearPool,
  Loadout,
  Modifier,
  SoftConstraint,
  StatName,
} from "@/models/types";

import {
  ATLANTEAN_BONUS_VALUES,
  computeLoadoutStats,
  emptyStats,
  getValidAtlanteanChoices,
  resolveAtlanteanBonus,
  STAT_NAMES,
} from "@/search/stats";

import {
  DEFAULT_HARD_CONSTRAINTS,
  validateLoadout,
} from "@/search/constraints";

import { computeFitness, FITNESS_PRESETS } from "@/search/fitness";
import { ExhaustiveSearch } from "@/search/exhaustive";

import {
  loadEnchantments,
  loadEquipment,
  loadGearPool,
  loadGems,
  loadModifiers,
} from "@/data/loaders";

// ---------------------------------------------------------------------------
// Test data factories
// ---------------------------------------------------------------------------

function makeEquipment(
  overrides: Partial<EquipmentPiece> & {
    id: string;
    name: string;
    slot: EquipmentPiece["slot"];
  },
): EquipmentPiece {
  return {
    baseStats: {},
    socketCount: 0,
    maxLevel: 1,
    tags: [],
    ...overrides,
  };
}

function makeSlot(
  piece: EquipmentPiece,
  extras?: {
    enchantment?: Enchantment;
    modifier?: Modifier;
    gems?: readonly Gem[];
  },
): EquippedSlot {
  return {
    piece,
    enchantment: extras?.enchantment,
    modifier: extras?.modifier,
    gems: extras?.gems ?? [],
  };
}

function makeLoadout(
  slots: [EquippedSlot, EquippedSlot, EquippedSlot, EquippedSlot, EquippedSlot],
): Loadout {
  return { slots };
}

function makeStats(overrides?: Partial<Record<StatName, number>>): Record<StatName, number> {
  return { ...emptyStats(), ...overrides };
}

// ---------------------------------------------------------------------------
// 1. Stats computation with known values
// ---------------------------------------------------------------------------

describe("integration: stats computation", () => {
  it("computes total stats for a known loadout", () => {
    const chest = makeEquipment({
      id: "chest-1",
      name: "Iron Armor",
      slot: "chestplate",
      baseStats: { defense: 200, power: 20 },
    });
    const legs = makeEquipment({
      id: "legs-1",
      name: "Iron Greaves",
      slot: "leggings",
      baseStats: { defense: 150, power: 15 },
    });
    const acc1 = makeEquipment({
      id: "acc-1",
      name: "Ring",
      slot: "accessory",
      baseStats: { defense: 30 },
    });
    const acc2 = makeEquipment({
      id: "acc-2",
      name: "Helmet",
      slot: "accessory-H",
      baseStats: { defense: 40, size: 10 },
    });
    const acc3 = makeEquipment({
      id: "acc-3",
      name: "Amulet",
      slot: "accessory-A",
      baseStats: { power: 8, dexterity: 5 },
    });

    const enchant: Enchantment = {
      id: "hard",
      name: "Hard",
      tier: 1,
      applicableTo: ["armor"],
      stats: { defense: 50 },
    };
    const gem: Gem = {
      id: "def-gem",
      name: "Defense Gem",
      tier: 1,
      stats: { defense: 10 },
    };

    const loadout = makeLoadout([
      makeSlot(chest, { enchantment: enchant, gems: [gem] }),
      makeSlot(legs, { enchantment: enchant }),
      makeSlot(acc1),
      makeSlot(acc2),
      makeSlot(acc3),
    ]);

    const stats = computeLoadoutStats(loadout);

    // defense: 200 + 50 + 10 + 150 + 50 + 30 + 40 = 530
    expect(stats.defense).toBe(530);
    // power: 20 + 15 + 8 = 43
    expect(stats.power).toBe(43);
    // size: 10
    expect(stats.size).toBe(10);
    // dexterity: 5
    expect(stats.dexterity).toBe(5);
    // everything else 0
    expect(stats.haste).toBe(0);
    expect(stats.insanity).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 2. Constraint validation
// ---------------------------------------------------------------------------

describe("integration: constraint validation", () => {
  const defaults = DEFAULT_HARD_CONSTRAINTS;

  function validSlots(): [
    EquippedSlot, EquippedSlot, EquippedSlot, EquippedSlot, EquippedSlot,
  ] {
    return [
      makeSlot(makeEquipment({ id: "c1", name: "Chest", slot: "chestplate" })),
      makeSlot(makeEquipment({ id: "l1", name: "Legs", slot: "leggings" })),
      makeSlot(makeEquipment({ id: "a1", name: "Ring", slot: "accessory" })),
      makeSlot(makeEquipment({ id: "a2", name: "Helm", slot: "accessory-H" })),
      makeSlot(makeEquipment({ id: "a3", name: "Amul", slot: "accessory-A" })),
    ];
  }

  it("valid loadout passes all constraints", () => {
    const result = validateLoadout(makeLoadout(validSlots()), defaults);
    expect(result.valid).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it("duplicate items rejected (noDuplicateItems)", () => {
    const slots = validSlots();
    // Make the ring share the chest's ID
    slots[2] = makeSlot(
      makeEquipment({ id: "c1", name: "Ring Dup", slot: "accessory" }),
    );
    const result = validateLoadout(makeLoadout(slots), defaults);
    expect(result.valid).toBe(false);
    expect(result.violations.some((v) => v.rule === "no-duplicates")).toBe(true);
  });

  it("too many helmets rejected (maxHelmetAccessories)", () => {
    const slots: [EquippedSlot, EquippedSlot, EquippedSlot, EquippedSlot, EquippedSlot] = [
      makeSlot(makeEquipment({ id: "c1", name: "Chest", slot: "chestplate" })),
      makeSlot(makeEquipment({ id: "l1", name: "Legs", slot: "leggings" })),
      makeSlot(makeEquipment({ id: "h1", name: "Helm1", slot: "accessory-H" })),
      makeSlot(makeEquipment({ id: "h2", name: "Helm2", slot: "accessory-H" })),
      makeSlot(makeEquipment({ id: "a1", name: "Ring", slot: "accessory" })),
    ];
    const result = validateLoadout(makeLoadout(slots), defaults);
    expect(result.valid).toBe(false);
    expect(result.violations.some((v) => v.rule === "helmet-limit")).toBe(true);
  });

  it("too many amulets rejected (maxAmuletAccessories)", () => {
    const slots: [EquippedSlot, EquippedSlot, EquippedSlot, EquippedSlot, EquippedSlot] = [
      makeSlot(makeEquipment({ id: "c1", name: "Chest", slot: "chestplate" })),
      makeSlot(makeEquipment({ id: "l1", name: "Legs", slot: "leggings" })),
      makeSlot(makeEquipment({ id: "am1", name: "Amul1", slot: "accessory-A" })),
      makeSlot(makeEquipment({ id: "am2", name: "Amul2", slot: "accessory-A" })),
      makeSlot(makeEquipment({ id: "a1", name: "Ring", slot: "accessory" })),
    ];
    const result = validateLoadout(makeLoadout(slots), defaults);
    expect(result.valid).toBe(false);
    expect(result.violations.some((v) => v.rule === "amulet-limit")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 3. Fitness scoring against Mage preset
// ---------------------------------------------------------------------------

describe("integration: fitness scoring", () => {
  it("scores a known loadout against Mage preset", () => {
    const magePreset = FITNESS_PRESETS["Mage Build"];
    expect(magePreset).toBeDefined();
    if (magePreset == null) return;

    // Build stats that satisfy the Mage preset constraints:
    // defense >= 700, power >= 100, dexterity ~ 300, size ~ 300,
    // insanity atMost 1, drawback atMost 2
    const stats = makeStats({
      defense: 800,
      power: 120,
      dexterity: 300,
      size: 300,
      insanity: 1,
      drawback: 1,
    });

    const score = computeFitness(stats, magePreset);

    // Manual computation per constraint:
    // 1. defense atLeast 700 w=100: above by 100 -> (100)*100*0.1 = 1000
    // 2. power atLeast 100 w=90:   above by 20 -> (20)*90*0.1 = 180
    // 3. dexterity target 300 w=80 hardCap=330: at target -> 0
    // 4. size target 300 w=70 hardCap=330: at target -> 0
    // 5. insanity atMost 1 w=100: 1 <= 1 -> 0
    // 6. drawback atMost 2 w=100: 1 <= 2 -> 0
    // Total = 1180
    expect(score).toBe(1180);
  });

  it("disqualifies loadout failing exactly constraint", () => {
    const exactConstraints: SoftConstraint[] = [
      { stat: "insanity", type: "exactly", value: 1, weight: 100 },
    ];

    const stats = makeStats({ insanity: 0 });
    expect(computeFitness(stats, exactConstraints)).toBe(-Infinity);

    const matching = makeStats({ insanity: 1 });
    expect(computeFitness(matching, exactConstraints)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 4. Search with known optimal
// ---------------------------------------------------------------------------

describe("integration: exhaustive search", () => {
  it("finds the highest-defense combination", async () => {
    const pool: GearPool = {
      chestplates: [
        makeEquipment({ id: "c-lo", name: "Weak Chest", slot: "chestplate", baseStats: { defense: 100 } }),
        makeEquipment({ id: "c-hi", name: "Strong Chest", slot: "chestplate", baseStats: { defense: 300 } }),
      ],
      leggings: [
        makeEquipment({ id: "l-lo", name: "Weak Legs", slot: "leggings", baseStats: { defense: 50 } }),
        makeEquipment({ id: "l-hi", name: "Strong Legs", slot: "leggings", baseStats: { defense: 200 } }),
      ],
      accessories: [
        makeEquipment({ id: "a1", name: "Ring A", slot: "accessory", baseStats: { defense: 10 } }),
        makeEquipment({ id: "a2", name: "Ring B", slot: "accessory", baseStats: { defense: 20 } }),
        makeEquipment({ id: "a3", name: "Helmet", slot: "accessory-H", baseStats: { defense: 30 } }),
        makeEquipment({ id: "a4", name: "Amulet", slot: "accessory-A", baseStats: { defense: 40 } }),
      ],
      enchantments: [],
      modifiers: [],
      gems: [],
    };

    const fitness: SoftConstraint[] = [
      { stat: "defense", type: "maximize", weight: 1 },
    ];

    const search = new ExhaustiveSearch();
    const results = await search.search(
      pool,
      DEFAULT_HARD_CONSTRAINTS,
      fitness,
      { maxResults: 10 },
    );

    expect(results.length).toBeGreaterThan(0);

    const best = results[0];
    expect(best).toBeDefined();
    if (best == null) return;

    // Best combo: c-hi(300) + l-hi(200) + ring B(20) + helmet(30) + amulet(40) = 590
    expect(best.stats.defense).toBe(590);
    expect(best.score).toBe(590); // maximize with weight 1

    // Verify the pieces in the best loadout
    const ids = best.loadout.slots.map((s) => s.piece.id);
    expect(ids).toContain("c-hi");
    expect(ids).toContain("l-hi");
  });
});

// ---------------------------------------------------------------------------
// 5. Edge cases
// ---------------------------------------------------------------------------

describe("integration: edge cases", () => {
  it("empty gear pool returns empty results", async () => {
    const pool: GearPool = {
      chestplates: [],
      leggings: [],
      accessories: [],
      enchantments: [],
      modifiers: [],
      gems: [],
    };

    const search = new ExhaustiveSearch();
    const results = await search.search(
      pool,
      DEFAULT_HARD_CONSTRAINTS,
      [{ stat: "defense", type: "maximize", weight: 1 }],
      { maxResults: 10 },
    );

    expect(results).toHaveLength(0);
  });

  it("single valid combination returns exactly one result", async () => {
    const pool: GearPool = {
      chestplates: [
        makeEquipment({ id: "c1", name: "Chest", slot: "chestplate", baseStats: { defense: 100 } }),
      ],
      leggings: [
        makeEquipment({ id: "l1", name: "Legs", slot: "leggings", baseStats: { defense: 80 } }),
      ],
      accessories: [
        makeEquipment({ id: "a1", name: "Ring", slot: "accessory", baseStats: { defense: 10 } }),
        makeEquipment({ id: "a2", name: "Helmet", slot: "accessory-H", baseStats: { defense: 20 } }),
        makeEquipment({ id: "a3", name: "Amulet", slot: "accessory-A", baseStats: { defense: 30 } }),
      ],
      enchantments: [],
      modifiers: [],
      gems: [],
    };

    const search = new ExhaustiveSearch();
    const results = await search.search(
      pool,
      DEFAULT_HARD_CONSTRAINTS,
      [{ stat: "defense", type: "maximize", weight: 1 }],
      { maxResults: 10 },
    );

    expect(results).toHaveLength(1);
    const only = results[0];
    expect(only).toBeDefined();
    if (only != null) {
      expect(only.stats.defense).toBe(240); // 100 + 80 + 10 + 20 + 30
    }
  });

  it("all items same stats yields all results with same score", async () => {
    const pool: GearPool = {
      chestplates: [
        makeEquipment({ id: "c1", name: "Chest A", slot: "chestplate", baseStats: { defense: 50 } }),
        makeEquipment({ id: "c2", name: "Chest B", slot: "chestplate", baseStats: { defense: 50 } }),
      ],
      leggings: [
        makeEquipment({ id: "l1", name: "Legs", slot: "leggings", baseStats: { defense: 50 } }),
      ],
      accessories: [
        makeEquipment({ id: "a1", name: "Ring 1", slot: "accessory", baseStats: { defense: 50 } }),
        makeEquipment({ id: "a2", name: "Ring 2", slot: "accessory", baseStats: { defense: 50 } }),
        makeEquipment({ id: "a3", name: "Helmet", slot: "accessory-H", baseStats: { defense: 50 } }),
        makeEquipment({ id: "a4", name: "Amulet", slot: "accessory-A", baseStats: { defense: 50 } }),
      ],
      enchantments: [],
      modifiers: [],
      gems: [],
    };

    const search = new ExhaustiveSearch();
    const results = await search.search(
      pool,
      DEFAULT_HARD_CONSTRAINTS,
      [{ stat: "defense", type: "maximize", weight: 1 }],
      { maxResults: 10 },
    );

    expect(results.length).toBeGreaterThan(1);

    const firstScore = results[0]?.score;
    for (const r of results) {
      expect(r.score).toBe(firstScore);
    }
  });
});

// ---------------------------------------------------------------------------
// 6. Atlantean modifier stat selection
// ---------------------------------------------------------------------------

describe("integration: atlantean modifiers", () => {
  const atlanteanMod: Modifier = {
    id: "atl-1",
    name: "Atlantean",
    stats: { insanity: 1 },
    atlanteanBehavior: {
      insanity: 1,
      possibleBonusStats: ["power", "defense", "size", "dexterity"],
    },
  };

  it("getValidAtlanteanChoices excludes stats on base item and gems", () => {
    const piece = makeEquipment({
      id: "p1",
      name: "Piece",
      slot: "chestplate",
      baseStats: { power: 10 },
    });
    const gem: Gem = {
      id: "g1",
      name: "Size Gem",
      tier: 1,
      stats: { size: 5 },
    };

    const slot = makeSlot(piece, { modifier: atlanteanMod, gems: [gem] });
    const choices = getValidAtlanteanChoices(slot);

    // power excluded (base), size excluded (gem)
    // defense and dexterity remain
    expect(choices).toEqual(["defense", "dexterity"]);
  });

  it("resolveAtlanteanBonus returns correct values", () => {
    const piece = makeEquipment({
      id: "p1",
      name: "Piece",
      slot: "chestplate",
      baseStats: {},
    });
    const slot = makeSlot(piece, { modifier: atlanteanMod });

    expect(resolveAtlanteanBonus(slot, "defense")).toEqual({
      defense: ATLANTEAN_BONUS_VALUES.defense,
    });
    expect(ATLANTEAN_BONUS_VALUES.defense).toBe(116);

    expect(resolveAtlanteanBonus(slot, "power")).toEqual({
      power: ATLANTEAN_BONUS_VALUES.power,
    });
    expect(ATLANTEAN_BONUS_VALUES.power).toBe(13);

    expect(resolveAtlanteanBonus(slot, null)).toEqual({});
  });

  it("atlantean bonus integrates into loadout stats", () => {
    const piece = makeEquipment({
      id: "c1",
      name: "Chest",
      slot: "chestplate",
      baseStats: { defense: 100 },
    });
    const legs = makeEquipment({
      id: "l1", name: "Legs", slot: "leggings", baseStats: {},
    });
    const a1 = makeEquipment({ id: "a1", name: "R", slot: "accessory", baseStats: {} });
    const a2 = makeEquipment({ id: "a2", name: "H", slot: "accessory-H", baseStats: {} });
    const a3 = makeEquipment({ id: "a3", name: "A", slot: "accessory-A", baseStats: {} });

    const loadout = makeLoadout([
      makeSlot(piece, { modifier: atlanteanMod }),
      makeSlot(legs),
      makeSlot(a1),
      makeSlot(a2),
      makeSlot(a3),
    ]);

    const choices = new Map<number, StatName>([[0, "size"]]);
    const stats = computeLoadoutStats(loadout, choices);

    expect(stats.defense).toBe(100);
    expect(stats.size).toBe(38); // ATLANTEAN_BONUS_VALUES.size
    expect(stats.insanity).toBe(1); // from atlantean modifier stats
  });
});

// ---------------------------------------------------------------------------
// 7. Data loading
// ---------------------------------------------------------------------------

describe("integration: data loading", () => {
  it("loadEquipment returns non-empty array", () => {
    const equipment = loadEquipment();
    expect(equipment.length).toBeGreaterThan(0);
  });

  it("loadEnchantments returns non-empty array", () => {
    const enchantments = loadEnchantments();
    expect(enchantments.length).toBeGreaterThan(0);
  });

  it("loadModifiers returns non-empty array", () => {
    const modifiers = loadModifiers();
    expect(modifiers.length).toBeGreaterThan(0);
  });

  it("loadGems returns non-empty array", () => {
    const gems = loadGems();
    expect(gems.length).toBeGreaterThan(0);
  });

  it("loadGearPool returns pool with items in each category", () => {
    const pool = loadGearPool();
    expect(pool.chestplates.length).toBeGreaterThan(0);
    expect(pool.leggings.length).toBeGreaterThan(0);
    expect(pool.accessories.length).toBeGreaterThan(0);
    expect(pool.enchantments.length).toBeGreaterThan(0);
    expect(pool.modifiers.length).toBeGreaterThan(0);
    expect(pool.gems.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// 8. Full pipeline: load -> validate -> score -> rank
// ---------------------------------------------------------------------------

describe("integration: full pipeline round-trip", () => {
  it("validates and scores a hand-built loadout through the full pipeline", () => {
    const chest = makeEquipment({
      id: "pipe-c", name: "Pipe Chest", slot: "chestplate",
      baseStats: { defense: 500, power: 50 },
    });
    const legs = makeEquipment({
      id: "pipe-l", name: "Pipe Legs", slot: "leggings",
      baseStats: { defense: 250, power: 60 },
    });
    const a1 = makeEquipment({
      id: "pipe-a1", name: "Ring", slot: "accessory",
      baseStats: { dexterity: 300 },
    });
    const a2 = makeEquipment({
      id: "pipe-a2", name: "Helm", slot: "accessory-H",
      baseStats: { size: 300 },
    });
    const a3 = makeEquipment({
      id: "pipe-a3", name: "Amul", slot: "accessory-A",
      baseStats: { insanity: 1 },
    });

    const loadout = makeLoadout([
      makeSlot(chest), makeSlot(legs),
      makeSlot(a1), makeSlot(a2), makeSlot(a3),
    ]);

    // Step 1: validate
    const validation = validateLoadout(loadout, DEFAULT_HARD_CONSTRAINTS);
    expect(validation.valid).toBe(true);

    // Step 2: compute stats
    const stats = computeLoadoutStats(loadout);
    expect(stats.defense).toBe(750);
    expect(stats.power).toBe(110);
    expect(stats.dexterity).toBe(300);
    expect(stats.size).toBe(300);
    expect(stats.insanity).toBe(1);

    // Step 3: score against Mage preset
    const magePreset = FITNESS_PRESETS["Mage Build"];
    expect(magePreset).toBeDefined();
    if (magePreset == null) return;

    const score = computeFitness(stats, magePreset);

    // Manual computation:
    // defense atLeast 700 w=100: above by 50 -> 50*100*0.1 = 500
    // power atLeast 100 w=90:   above by 10 -> 10*90*0.1 = 90
    // dexterity target 300 w=80: at target -> 0
    // size target 300 w=70: at target -> 0
    // insanity atMost 1 w=100: 1 <= 1 -> 0
    // drawback atMost 2 w=100: 0 <= 2 -> 0
    // Total = 590
    expect(score).toBe(590);
  });

  it("STAT_NAMES constant has all 12 entries", () => {
    expect(STAT_NAMES).toHaveLength(12);
    const expected: StatName[] = [
      "power", "defense", "size", "dexterity", "range", "haste",
      "insanity", "warding", "drawback", "regeneration", "pierce", "resistance",
    ];
    expect(STAT_NAMES).toEqual(expected);
  });
});
