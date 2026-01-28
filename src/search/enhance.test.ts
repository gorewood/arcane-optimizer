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
  Loadout,
  Modifier,
  SoftConstraint,
} from "@/models/types";

import { DEFAULT_HARD_CONSTRAINTS } from "./constraints";
import { budgetAwareAssign } from "./enhance";
import { computeLoadoutStats } from "./stats";

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

const CHEST = makeEquipment({ id: "c1", name: "Chest", slot: "chestplate", baseStats: { defense: 200 }, atlanteanOnly: false });
const LEGS = makeEquipment({ id: "l1", name: "Legs", slot: "leggings", baseStats: { defense: 150 }, atlanteanOnly: false });
const ACC1 = makeEquipment({ id: "a1", name: "Ring", slot: "accessory", baseStats: { defense: 30 }, atlanteanOnly: false });
const ACC2 = makeEquipment({ id: "a2", name: "Helm", slot: "accessory-H", baseStats: { defense: 40 }, atlanteanOnly: false });
const ACC3 = makeEquipment({ id: "a3", name: "Amul", slot: "accessory-A", baseStats: { power: 8 }, atlanteanOnly: false });

const HARD_ENCHANT: Enchantment = {
  id: "hard", name: "Hard", tier: 1, applicableTo: ["armor"], stats: { defense: 50 },
};

const FROZEN: Modifier = {
  id: "frozen", name: "Frozen", stats: { defense: 76 },
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("atlanteanOnly modifier constraint", () => {
  const ATLANTEAN: Modifier = {
    id: "atlantean", name: "Atlantean", stats: {},
    atlanteanBehavior: {
      insanity: 1,
      possibleBonusStats: ["power", "defense", "size", "dexterity"],
    },
  };

  const SET_CHEST = makeEquipment({
    id: "set-c", name: "Set Chest", slot: "chestplate",
    setName: "TestSet", baseStats: { defense: 200 },
  });
  const SET_LEGS = makeEquipment({
    id: "set-l", name: "Set Legs", slot: "leggings",
    setName: "TestSet", baseStats: { defense: 150 },
  });
  const SET_ACC = makeEquipment({
    id: "set-a", name: "Set Cape", slot: "accessory",
    setName: "TestSet", baseStats: { defense: 30 },
  });
  const NONSET_ACC = makeEquipment({
    id: "ns-a", name: "Arcsphere", slot: "accessory",
    baseStats: { power: 10 }, atlanteanOnly: false,
  });
  const NONSET_AMULET = makeEquipment({
    id: "ns-am", name: "Amulet", slot: "accessory-A",
    baseStats: { power: 8 }, atlanteanOnly: false,
  });

  it("atlanteanOnly pieces only receive atlantean modifier", () => {
    const loadout = makeLoadout([SET_CHEST, SET_LEGS, SET_ACC, NONSET_ACC, NONSET_AMULET]);
    const pool: GearPool = {
      chestplates: [SET_CHEST], leggings: [SET_LEGS],
      accessories: [SET_ACC, NONSET_ACC, NONSET_AMULET],
      enchantments: [],
      modifiers: [FROZEN, ATLANTEAN],
      gems: [],
    };
    const fitness: SoftConstraint[] = [
      { stat: "defense", type: "maximize", weight: 1 },
    ];

    const result = budgetAwareAssign(loadout, pool, DEFAULT_HARD_CONSTRAINTS, fitness);

    // Set pieces (slots 0-2) should not have Frozen modifier
    const [s0, s1, s2] = result.loadout.slots;
    for (const slot of [s0, s1, s2]) {
      if (slot.modifier != null) {
        expect(slot.modifier.atlanteanBehavior).toBeDefined();
      }
    }
  });

  it("atlanteanOnly:false accessories can receive any modifier", () => {
    const loadout = makeLoadout([SET_CHEST, SET_LEGS, SET_ACC, NONSET_ACC, NONSET_AMULET]);
    const pool: GearPool = {
      chestplates: [SET_CHEST], leggings: [SET_LEGS],
      accessories: [SET_ACC, NONSET_ACC, NONSET_AMULET],
      enchantments: [],
      modifiers: [FROZEN],
      gems: [],
    };
    const fitness: SoftConstraint[] = [
      { stat: "defense", type: "maximize", weight: 1 },
    ];

    const result = budgetAwareAssign(loadout, pool, DEFAULT_HARD_CONSTRAINTS, fitness);

    const [s0, s1, s2, s3, s4] = result.loadout.slots;

    // Non-set accessories (slots 3-4) should be able to get Frozen
    const nonSetModifiers = [s3.modifier, s4.modifier];
    const hasFrozen = nonSetModifiers.some((m) => m?.id === "frozen");
    expect(hasFrozen).toBe(true);

    // Set pieces (slots 0-2) should NOT get Frozen (no atlantean in pool for them)
    for (const slot of [s0, s1, s2]) {
      expect(slot.modifier).toBeUndefined();
    }
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
    // Soft constraint controls insanity budget (no hard limit)
    const fitness: SoftConstraint[] = [
      { stat: "defense", type: "maximize", weight: 1 },
      { stat: "insanity", type: "atMost", value: 1, weight: 100 },
    ];

    const result = budgetAwareAssign(loadout, pool, DEFAULT_HARD_CONSTRAINTS, fitness);
    const stats = computeLoadoutStats(result.loadout, result.atlanteanChoices);

    // Insanity must be <= max(warding, soft constraint value of 1)
    expect(stats.insanity).toBeLessThanOrEqual(Math.max(stats.warding, 1));
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
    // Soft constraint controls drawback budget (no hard limit)
    const fitness: SoftConstraint[] = [
      { stat: "defense", type: "maximize", weight: 1 },
      { stat: "drawback", type: "atMost", value: 2, weight: 100 },
    ];

    const result = budgetAwareAssign(loadout, pool, DEFAULT_HARD_CONSTRAINTS, fitness);
    const stats = computeLoadoutStats(result.loadout, result.atlanteanChoices);

    expect(stats.drawback).toBeLessThanOrEqual(2);
  });

  it("uses drawback cap from soft constraints when present", () => {
    const drawbackGem: Gem = {
      id: "painite", name: "Painite", tier: 2, stats: { defense: 224, drawback: 1 },
    };

    // Multiple socketed items to demonstrate budget spread
    const socketed1 = makeEquipment({
      id: "c-sock", name: "Socketed Chest", slot: "chestplate",
      baseStats: { defense: 200 }, socketCount: 3,
    });
    const socketed2 = makeEquipment({
      id: "l-sock", name: "Socketed Legs", slot: "leggings",
      baseStats: { defense: 150 }, socketCount: 2,
    });
    const loadout = makeLoadout([socketed1, socketed2, ACC1, ACC2, ACC3]);
    const pool: GearPool = {
      chestplates: [socketed1], leggings: [socketed2], accessories: [ACC1, ACC2, ACC3],
      enchantments: [],
      modifiers: [],
      gems: [drawbackGem],
    };

    // Soft constraint with hardCap of 5 controls the drawback budget
    const fitness: SoftConstraint[] = [
      { stat: "defense", type: "maximize", weight: 1 },
      { stat: "drawback", type: "atMost", value: 3, weight: 100, hardCap: 5 },
    ];

    // Soft constraint hardCap: 5 is used as the budget limit
    const result = budgetAwareAssign(loadout, pool, DEFAULT_HARD_CONSTRAINTS, fitness);
    const stats = computeLoadoutStats(result.loadout, result.atlanteanChoices);

    // Should use the hardCap of 5, allowing up to 5 gems worth of drawback
    expect(stats.drawback).toBeGreaterThan(0);
    expect(stats.drawback).toBeLessThanOrEqual(5);
  });
});
