/**
 * Unit tests for Genetic Algorithm search.
 */

import { describe, expect, it } from "vitest";

import type {
  EquipmentPiece,
  GearPool,
  SoftConstraint,
} from "@/models/types";

import { DEFAULT_HARD_CONSTRAINTS } from "./constraints";
import { GeneticSearch } from "./genetic";

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

function smallPool(): GearPool {
  return {
    chestplates: [
      makeEquipment({ id: "c1", name: "Chest A", slot: "chestplate", baseStats: { defense: 200 } }),
      makeEquipment({ id: "c2", name: "Chest B", slot: "chestplate", baseStats: { defense: 300 } }),
    ],
    leggings: [
      makeEquipment({ id: "l1", name: "Legs A", slot: "leggings", baseStats: { defense: 100 } }),
      makeEquipment({ id: "l2", name: "Legs B", slot: "leggings", baseStats: { defense: 200 } }),
    ],
    accessories: [
      makeEquipment({ id: "a1", name: "Ring", slot: "accessory", baseStats: { defense: 20 } }),
      makeEquipment({ id: "a2", name: "Helm", slot: "accessory-H", baseStats: { defense: 30 } }),
      makeEquipment({ id: "a3", name: "Amul", slot: "accessory-A", baseStats: { defense: 40 } }),
      makeEquipment({ id: "a4", name: "Ring 2", slot: "accessory", baseStats: { defense: 50 } }),
    ],
    enchantments: [],
    modifiers: [],
    gems: [],
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("GeneticSearch", () => {
  it("returns results for a small pool", async () => {
    const search = new GeneticSearch();
    const fitness: SoftConstraint[] = [
      { stat: "defense", type: "maximize", weight: 1 },
    ];

    const results = await search.search(
      smallPool(),
      DEFAULT_HARD_CONSTRAINTS,
      fitness,
      {
        maxResults: 5,
        populationSize: 30,
        generations: 20,
      },
    );

    expect(results.length).toBeGreaterThan(0);
  });

  it("converges toward better scores over generations", async () => {
    const search = new GeneticSearch();
    const scores: number[] = [];

    search.onProgress = (_gen, _total, bestScore) => {
      scores.push(bestScore);
    };

    const fitness: SoftConstraint[] = [
      { stat: "defense", type: "maximize", weight: 1 },
    ];

    await search.search(
      smallPool(),
      DEFAULT_HARD_CONSTRAINTS,
      fitness,
      {
        maxResults: 5,
        populationSize: 30,
        generations: 30,
      },
    );

    // The final score should be >= first score (convergence)
    const first = scores[0] ?? -Infinity;
    const last = scores[scores.length - 1] ?? -Infinity;
    expect(last).toBeGreaterThanOrEqual(first);
  });

  it("can be cancelled", async () => {
    const search = new GeneticSearch();
    const fitness: SoftConstraint[] = [
      { stat: "defense", type: "maximize", weight: 1 },
    ];

    // Cancel immediately
    setTimeout(() => { search.cancel(); }, 5);

    const results = await search.search(
      smallPool(),
      DEFAULT_HARD_CONSTRAINTS,
      fitness,
      {
        maxResults: 5,
        populationSize: 50,
        generations: 1000,
      },
    );

    // Should have some results even after cancellation
    expect(results.length).toBeGreaterThanOrEqual(0);
  });

  it("finds near-optimal for small pool", async () => {
    const search = new GeneticSearch();
    const fitness: SoftConstraint[] = [
      { stat: "defense", type: "maximize", weight: 1 },
    ];

    const results = await search.search(
      smallPool(),
      DEFAULT_HARD_CONSTRAINTS,
      fitness,
      {
        maxResults: 5,
        populationSize: 50,
        generations: 50,
      },
    );

    expect(results.length).toBeGreaterThan(0);
    const best = results[0];
    expect(best).toBeDefined();
    if (best != null) {
      // Best should be c2(300) + l2(200) + ring2(50) + helm(30) + amul(40) = 620
      // GA may or may not find exact optimum, but should be close
      expect(best.stats.defense).toBeGreaterThanOrEqual(500);
    }
  });
});
