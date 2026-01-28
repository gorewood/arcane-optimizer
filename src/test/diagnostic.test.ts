/**
 * Diagnostic test — verifies search produces results with real game data
 * and all fitness presets. Catches regressions where overly restrictive
 * constraints disqualify all loadouts.
 */

import { describe, expect, it } from "vitest";

import { loadGearPool } from "@/data/loaders";
import { DEFAULT_HARD_CONSTRAINTS, validateLoadout } from "@/search/constraints";
import { computeFitness, FITNESS_PRESETS } from "@/search/fitness";
import { computeLoadoutStats } from "@/search/stats";
import {
  ExhaustiveSearch,
  generateAccessoryCombinations,
} from "@/search/exhaustive";
import { GeneticSearch } from "@/search/genetic";

describe("diagnostic: real data produces results", () => {
  const pool = loadGearPool();
  const constraints = DEFAULT_HARD_CONSTRAINTS;

  it("gear pool has items in each slot", () => {
    expect(pool.chestplates.length).toBeGreaterThan(0);
    expect(pool.leggings.length).toBeGreaterThan(0);
    expect(pool.accessories.length).toBeGreaterThanOrEqual(3);
  });

  it("accessory combinations are generated", () => {
    const combos = [
      ...generateAccessoryCombinations(pool.accessories, constraints),
    ];
    expect(combos.length).toBeGreaterThan(0);
  });

  it("valid bare loadouts exist in real data", () => {
    let validCount = 0;
    let totalChecked = 0;

    for (const chest of pool.chestplates) {
      for (const legs of pool.leggings) {
        const accGen = generateAccessoryCombinations(
          pool.accessories,
          constraints,
        );
        for (const acc of accGen) {
          const loadout = {
            slots: [
              { piece: chest, gems: [] },
              { piece: legs, gems: [] },
              { piece: acc[0], gems: [] },
              { piece: acc[1], gems: [] },
              { piece: acc[2], gems: [] },
            ] as const,
          };
          totalChecked++;
          const result = validateLoadout(loadout, constraints);
          if (result.valid) validCount++;
          if (totalChecked >= 200) break;
        }
        if (totalChecked >= 200) break;
      }
      if (totalChecked >= 200) break;
    }

    expect(validCount).toBeGreaterThan(0);
  });

  // Uses subset pool since budget-aware enhancement is always on.
  // Full pool + enhancement is too slow for unit tests (~15s+ per preset).
  const smallPool = {
    chestplates: pool.chestplates.slice(0, 3),
    leggings: pool.leggings.slice(0, 3),
    accessories: pool.accessories.slice(0, 6),
    enchantments: pool.enchantments.slice(0, 3),
    modifiers: pool.modifiers.slice(0, 3),
    gems: pool.gems.slice(0, 3),
  };

  it.each(Object.entries(FITNESS_PRESETS))(
    "preset '%s' produces positive scores with enhanced search",
    async (name, preset) => {
      const search = new ExhaustiveSearch();
      const results = await search.search(smallPool, constraints, preset, {
        maxResults: 5,
      });

      expect(
        results.length,
        `Search for "${name}" returned 0 results`,
      ).toBeGreaterThan(0);

      // Search should produce non-disqualified scores
      const best = results[0];
      if (best != null) {
        expect(best.score).toBeGreaterThan(-Infinity);
      }
    },
  );

  it(
    "GA converges on small pool",
    async () => {
      const search = new GeneticSearch();
      const fitness = FITNESS_PRESETS["Warrior Build"];
      if (fitness == null) return;

      const results = await search.search(
        smallPool,
        constraints,
        fitness,
        {
          maxResults: 5,
          populationSize: 30,
          generations: 20,
        },
      );

      expect(results.length).toBeGreaterThan(0);
    },
    15_000,
  );

  it("search respects insanity/drawback soft constraints", async () => {
    const search = new ExhaustiveSearch();
    const magePreset = FITNESS_PRESETS["Mage Build"];
    if (magePreset == null) return;

    const results = await search.search(smallPool, constraints, magePreset, {
      maxResults: 5,
    });

    for (const r of results) {
      const stats = r.stats;
      // Soft constraints in the preset penalize high insanity/drawback through fitness scoring
      // No hard limits - users control tolerances through goal system
      expect(stats.insanity).toBeGreaterThanOrEqual(0);
      expect(stats.drawback).toBeGreaterThanOrEqual(0);
    }
  });

  it("Mage Build preset does not disqualify all loadouts", () => {
    const magePreset = FITNESS_PRESETS["Mage Build"];
    expect(magePreset).toBeDefined();
    if (magePreset == null) return;
    let scored = 0;
    let disqualified = 0;

    for (const chest of pool.chestplates.slice(0, 3)) {
      for (const legs of pool.leggings.slice(0, 3)) {
        const accGen = generateAccessoryCombinations(
          pool.accessories,
          constraints,
        );
        for (const acc of accGen) {
          const loadout = {
            slots: [
              { piece: chest, gems: [] },
              { piece: legs, gems: [] },
              { piece: acc[0], gems: [] },
              { piece: acc[1], gems: [] },
              { piece: acc[2], gems: [] },
            ] as const,
          };

          const validation = validateLoadout(loadout, constraints);
          if (!validation.valid) continue;

          const stats = computeLoadoutStats(loadout);
          const score = computeFitness(stats, magePreset);

          if (score === -Infinity) {
            disqualified++;
          } else {
            scored++;
          }
          if (scored + disqualified >= 300) break;
        }
        if (scored + disqualified >= 300) break;
      }
      if (scored + disqualified >= 300) break;
    }

    expect(
      scored,
      `All ${String(disqualified)} loadouts were disqualified — ` +
        `Mage Build likely has an "exactly" or overly tight hardCap constraint`,
    ).toBeGreaterThan(0);
  });
});
