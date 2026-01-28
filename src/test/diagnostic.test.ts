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

  it.each(Object.entries(FITNESS_PRESETS))(
    "preset '%s' produces non-zero results with real data",
    async (name, preset) => {
      const search = new ExhaustiveSearch();
      const results = await search.search(pool, constraints, preset, {
        maxResults: 10,
      });

      // Every preset should find at least one result with full gear pool
      expect(
        results.length,
        `Preset "${name}" returned 0 results — likely has an overly ` +
          `restrictive constraint (e.g., "exactly" on a stat no bare ` +
          `loadout can match)`,
      ).toBeGreaterThan(0);
    },
  );

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
