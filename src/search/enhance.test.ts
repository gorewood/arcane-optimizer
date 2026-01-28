/**
 * Unit tests for enhancement assignment engine.
 */

import { describe, expect, it } from "vitest";

import type {
  Enchantment,
  EquipmentPiece,
  EquippedSlot,
  GearPool,
  Gem,
  HardConstraints,
  Loadout,
  Modifier,
  SoftConstraint,
} from "@/models/types";

import { DEFAULT_HARD_CONSTRAINTS } from "./constraints";
import { greedyAssignEnhancements, budgetAwareAssign } from "./enhance";
import { computeLoadoutStats } from "./stats";
import { computeFitness } from "./fitness";

// ---------------------------------------------------------------------------
// Helpers
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

function bareSlot(piece: EquipmentPiece): EquippedSlot {
  return { piece, gems: [] };
}

function makeLoadout(pieces: [EquipmentPiece, EquipmentPiece, EquipmentPiece, EquipmentPiece, EquipmentPiece]): Loadout {
  return {
    slots: [
      bareSlot(pieces[0]),
      bareSlot(pieces[1]),
      bareSlot(pieces[2]),
      bareSlot(pieces[3]),
      bareSlot(pieces[4]),
    ],
  };
}

const CHEST = makeEquipment({ id: "c1", name: "Chest", slot: "chestplate", baseStats: { defense: 200 } });
const LEGS = makeEquipment({ id: "l1", name: "Legs", slot: "leggings", baseStats: { defense: 150 } });
const ACC1 = makeEquipment({ id: "a1", name: "Ring", slot: "accessory", baseStats: { defense: 30 } });
const ACC2 = makeEquipment({ id: "a2", name: "Helm", slot: "accessory-H", baseStats: { defense: 40 } });
const ACC3 = makeEquipment({ id: "a3", name: "Amul", slot: "accessory-A", baseStats: { power: 8 } });

const HARD_ENCHANT: Enchantment = {
  id: "hard", name: "Hard", tier: 1, applicableTo: ["armor"], stats: { defense: 50 },
};

const POWERFUL_ENCHANT: Enchantment = {
  id: "powerful", name: "Powerful", tier: 2, applicableTo: ["armor", "accessory"], stats: { power: 14 },
};

const GILDED: Modifier = {
  id: "gilded", name: "Gilded", stats: {}, grantsSocket: true,
};

const FROZEN: Modifier = {
  id: "frozen", name: "Frozen", stats: { defense: 76 },
};

const DEF_GEM: Gem = {
  id: "def-gem", name: "Defense Gem", tier: 1, stats: { defense: 10 },
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("greedyAssignEnhancements", () => {
  it("assigns enchantments to improve score", () => {
    const loadout = makeLoadout([CHEST, LEGS, ACC1, ACC2, ACC3]);
    const pool: GearPool = {
      chestplates: [CHEST], leggings: [LEGS], accessories: [ACC1, ACC2, ACC3],
      enchantments: [HARD_ENCHANT],
      modifiers: [],
      gems: [],
    };
    const fitness: SoftConstraint[] = [
      { stat: "defense", type: "maximize", weight: 1 },
    ];

    const result = greedyAssignEnhancements(loadout, pool, DEFAULT_HARD_CONSTRAINTS, fitness);

    // Should assign Hard enchantment to armor slots (chest + legs)
    const enhancedStats = computeLoadoutStats(result.loadout, result.atlanteanChoices);
    expect(enhancedStats.defense).toBeGreaterThan(420); // base is 420
  });

  it("assigns modifiers to improve score", () => {
    const loadout = makeLoadout([CHEST, LEGS, ACC1, ACC2, ACC3]);
    const pool: GearPool = {
      chestplates: [CHEST], leggings: [LEGS], accessories: [ACC1, ACC2, ACC3],
      enchantments: [],
      modifiers: [FROZEN],
      gems: [],
    };
    const fitness: SoftConstraint[] = [
      { stat: "defense", type: "maximize", weight: 1 },
    ];

    const result = greedyAssignEnhancements(loadout, pool, DEFAULT_HARD_CONSTRAINTS, fitness);
    const enhancedStats = computeLoadoutStats(result.loadout, result.atlanteanChoices);

    // Frozen gives +76 defense; should be assigned to multiple slots
    expect(enhancedStats.defense).toBeGreaterThan(420);
  });

  it("assigns gems via greedy per-socket", () => {
    const socketed = makeEquipment({
      id: "c-sock", name: "Socketed Chest", slot: "chestplate",
      baseStats: { defense: 200 }, socketCount: 2,
    });
    const loadout = makeLoadout([socketed, LEGS, ACC1, ACC2, ACC3]);
    const pool: GearPool = {
      chestplates: [socketed], leggings: [LEGS], accessories: [ACC1, ACC2, ACC3],
      enchantments: [],
      modifiers: [],
      gems: [DEF_GEM],
    };
    const fitness: SoftConstraint[] = [
      { stat: "defense", type: "maximize", weight: 1 },
    ];

    const result = greedyAssignEnhancements(loadout, pool, DEFAULT_HARD_CONSTRAINTS, fitness);
    const enhancedStats = computeLoadoutStats(result.loadout, result.atlanteanChoices);

    // Chest has 2 sockets, should get 2 defense gems (+20 total)
    expect(enhancedStats.defense).toBeGreaterThanOrEqual(440);
  });

  it("returns loadout with no enhancements when pool is empty", () => {
    const loadout = makeLoadout([CHEST, LEGS, ACC1, ACC2, ACC3]);
    const pool: GearPool = {
      chestplates: [CHEST], leggings: [LEGS], accessories: [ACC1, ACC2, ACC3],
      enchantments: [],
      modifiers: [],
      gems: [],
    };
    const fitness: SoftConstraint[] = [
      { stat: "defense", type: "maximize", weight: 1 },
    ];

    const result = greedyAssignEnhancements(loadout, pool, DEFAULT_HARD_CONSTRAINTS, fitness);
    const enhancedStats = computeLoadoutStats(result.loadout, result.atlanteanChoices);

    // Same as bare loadout
    expect(enhancedStats.defense).toBe(420);
  });

  it("enhanced loadout scores better than bare on maximize", () => {
    const loadout = makeLoadout([CHEST, LEGS, ACC1, ACC2, ACC3]);
    const pool: GearPool = {
      chestplates: [CHEST], leggings: [LEGS], accessories: [ACC1, ACC2, ACC3],
      enchantments: [HARD_ENCHANT, POWERFUL_ENCHANT],
      modifiers: [FROZEN, GILDED],
      gems: [DEF_GEM],
    };
    const fitness: SoftConstraint[] = [
      { stat: "defense", type: "maximize", weight: 1 },
    ];

    const bareStats = computeLoadoutStats(loadout);
    const bareScore = computeFitness(bareStats, fitness);

    const result = greedyAssignEnhancements(loadout, pool, DEFAULT_HARD_CONSTRAINTS, fitness);
    const enhancedStats = computeLoadoutStats(result.loadout, result.atlanteanChoices);
    const enhancedScore = computeFitness(enhancedStats, fitness);

    expect(enhancedScore).toBeGreaterThan(bareScore);
  });
});

describe("budgetAwareAssign", () => {
  it("respects insanity budget", () => {
    const atlantean: Modifier = {
      id: "atlantean", name: "Atlantean", stats: {},
      atlanteanBehavior: {
        insanity: 1,
        possibleBonusStats: ["power", "defense", "size", "dexterity"],
      },
    };

    const loadout = makeLoadout([CHEST, LEGS, ACC1, ACC2, ACC3]);
    const pool: GearPool = {
      chestplates: [CHEST], leggings: [LEGS], accessories: [ACC1, ACC2, ACC3],
      enchantments: [HARD_ENCHANT],
      modifiers: [atlantean],
      gems: [],
    };
    const fitness: SoftConstraint[] = [
      { stat: "defense", type: "maximize", weight: 1 },
    ];

    const constraints: HardConstraints = {
      ...DEFAULT_HARD_CONSTRAINTS,
      maxNetInsanity: 1, // only 1 atlantean allowed
    };

    const result = budgetAwareAssign(loadout, pool, constraints, fitness);
    const stats = computeLoadoutStats(result.loadout, result.atlanteanChoices);

    // Should not use more than 1 atlantean (net insanity <= 1)
    expect(stats.insanity).toBeLessThanOrEqual(1);
  });

  it("respects drawback budget", () => {
    const drawbackGem: Gem = {
      id: "painite", name: "Painite", tier: 2, stats: { defense: 224, drawback: 1 },
    };

    const socketed = makeEquipment({
      id: "c-sock", name: "Socketed Chest", slot: "chestplate",
      baseStats: { defense: 200 }, socketCount: 3,
    });
    const loadout = makeLoadout([socketed, LEGS, ACC1, ACC2, ACC3]);
    const pool: GearPool = {
      chestplates: [socketed], leggings: [LEGS], accessories: [ACC1, ACC2, ACC3],
      enchantments: [],
      modifiers: [],
      gems: [drawbackGem],
    };
    const fitness: SoftConstraint[] = [
      { stat: "defense", type: "maximize", weight: 1 },
    ];

    const constraints: HardConstraints = {
      ...DEFAULT_HARD_CONSTRAINTS,
      maxDrawback: 2,
    };

    const result = budgetAwareAssign(loadout, pool, constraints, fitness);
    const stats = computeLoadoutStats(result.loadout, result.atlanteanChoices);

    expect(stats.drawback).toBeLessThanOrEqual(2);
  });
});
