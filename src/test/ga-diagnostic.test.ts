/**
 * GA diagnostic test — instruments the genetic algorithm internals
 * to measure population survival rate, convergence speed, and diversity.
 *
 * Phase 1 of systematic debugging: gather evidence before proposing fixes.
 */

import { describe, expect, it } from "vitest";

import type { SoftConstraint } from "@/models/types";
import { loadGearPool } from "@/data/loaders";
import { DEFAULT_HARD_CONSTRAINTS, validateLoadout } from "@/search/constraints";
import { computeFitness } from "@/search/fitness";
import { computeLoadoutStats } from "@/search/stats";
import { getTestProfiles } from "@/test/profile-fixtures";
import {
  buildIndexedPool,
  decodeChromosome,
  evaluate,
  randomChromosome,
} from "@/search/genetic-chromosome";
import type { EvaluatedIndividual } from "@/search/genetic-chromosome";
import { extractResults, GeneticSearch } from "@/search/genetic-core";
import { repair } from "@/search/genetic-repair";

const pool = loadGearPool();
const indexed = buildIndexedPool(pool);
const constraints = DEFAULT_HARD_CONSTRAINTS;

const testProfiles = getTestProfiles();

describe("GA diagnostic: root cause investigation", () => {
  it.each(Object.entries(testProfiles))(
    "measures initial population survival rate for '%s'",
    (_name, preset) => {
      const targetSize = 200;
      const maxAttempts = targetSize * 20;
      let attempts = 0;
      let valid = 0;
      let decodeFail = 0;
      let constraintFail = 0;
      let fitnessFail = 0;

      while (valid < targetSize && attempts < maxAttempts) {
        attempts++;
        const chromo = randomChromosome(indexed);
        repair(chromo, indexed);

        const decoded = decodeChromosome(chromo, indexed);
        if (decoded == null) { decodeFail++; continue; }

        const validation = validateLoadout(decoded.loadout, constraints);
        if (!validation.valid) { constraintFail++; continue; }

        const stats = computeLoadoutStats(decoded.loadout, decoded.atlanteanMap);
        const score = computeFitness(stats, preset);
        if (score === -Infinity) { fitnessFail++; continue; }

        valid++;
      }

      const survivalRate = valid / attempts;
      // Log diagnostic data
      console.log(`[${_name}] Population fill: ${String(valid)}/${String(targetSize)} in ${String(attempts)} attempts`);
      console.log(`  Survival rate: ${(survivalRate * 100).toFixed(1)}%`);
      console.log(`  Decode failures: ${String(decodeFail)}`);
      console.log(`  Constraint failures: ${String(constraintFail)}`);
      console.log(`  Fitness -Infinity: ${String(fitnessFail)}`);

      // Population should fill — if not, that's a root cause
      expect(valid).toBe(targetSize);
    },
  );

  it("measures constraint failure breakdown", () => {
    let total = 0;
    let helmetFail = 0;
    let amuletFail = 0;
    let insanityFail = 0;
    let drawbackFail = 0;
    let duplicateFail = 0;
    let otherFail = 0;
    let valid = 0;

    for (let i = 0; i < 2000; i++) {
      const chromo = randomChromosome(indexed);
      repair(chromo, indexed);
      const decoded = decodeChromosome(chromo, indexed);
      if (decoded == null) continue;
      total++;

      const result = validateLoadout(decoded.loadout, constraints);
      if (result.valid) { valid++; continue; }

      for (const v of result.violations) {
        if (v.rule === "helmet-limit") helmetFail++;
        else if (v.rule === "amulet-limit") amuletFail++;
        else if (v.rule === "insanity") insanityFail++;
        else if (v.rule === "drawback-cap") drawbackFail++;
        else if (v.rule === "no-duplicates") duplicateFail++;
        else otherFail++;
      }
    }

    console.log(`[Constraint breakdown] ${String(total)} decoded chromosomes:`);
    console.log(`  Valid: ${String(valid)} (${(valid / total * 100).toFixed(1)}%)`);
    console.log(`  Helmet limit: ${String(helmetFail)}`);
    console.log(`  Amulet limit: ${String(amuletFail)}`);
    console.log(`  Insanity: ${String(insanityFail)}`);
    console.log(`  Drawback: ${String(drawbackFail)}`);
    console.log(`  Duplicate: ${String(duplicateFail)}`);
    console.log(`  Other: ${String(otherFail)}`);

    expect(total).toBeGreaterThan(0);
  });

  it.each(Object.entries(testProfiles))(
    "measures convergence and diversity for '%s'",
    async (_name, preset) => {
      const search = new GeneticSearch();
      const generations: number[] = [];
      let genCount = 0;

      search.onProgress = (_gen, _total, bestScore) => {
        genCount = _gen;
        generations.push(bestScore);
      };

      const results = await search.search(
        pool,
        constraints,
        preset,
        {
          maxResults: 20,
          populationSize: 200,
          generations: 500,
        },
      );

      console.log(`[${_name}] Ran ${String(genCount)} generations`);
      console.log(`  Results: ${String(results.length)} unique loadouts`);
      if (results.length > 0) {
        const best = results[0];
        const worst = results[results.length - 1];
        console.log(`  Best score: ${String(best?.score)}`);
        console.log(`  Worst score: ${String(worst?.score)}`);
      }

      // If stagnation exited early, report how early
      if (genCount < 500) {
        console.log(`  Stagnation exit at gen ${String(genCount)} (of 500)`);
      }

      expect(results.length).toBeGreaterThan(0);
    },
  );

  // Test fixture for diversity measurement
  const diversityTestConstraints: SoftConstraint[] = [
    { stat: "defense", type: "atLeast", value: 500, weight: 100 },
    { stat: "power", type: "atLeast", value: 50, weight: 90 },
    { stat: "insanity", type: "atMost", value: 2, weight: 100 },
    { stat: "drawback", type: "atMost", value: 3, weight: 100 },
  ];

  it("measures population diversity at stagnation exit", () => {
    const preset = diversityTestConstraints;

    // Build population manually to inspect diversity
    const targetSize = 200;
    const pop: EvaluatedIndividual[] = [];
    let attempts = 0;
    while (pop.length < targetSize && attempts < targetSize * 20) {
      attempts++;
      const chromo = randomChromosome(indexed);
      repair(chromo, indexed);
      const individual = evaluate(chromo, indexed, constraints, preset);
      if (individual != null) pop.push(individual);
    }

    // Check initial diversity
    const initialKeys = new Set(pop.map((ind) =>
      ind.loadout.slots.map((s) => s.piece.id).join(","),
    ));

    console.log(`[Initial diversity] ${String(pop.length)} individuals, ${String(initialKeys.size)} unique piece combos`);

    // Also check what extractResults would return
    const results = extractResults(pop, 20);
    console.log(`  extractResults: ${String(results.length)} unique results (max 20)`);

    expect(initialKeys.size).toBeGreaterThan(0);
  });

  it("measures dedup key coverage — full loadout vs pieces only", async () => {
    const preset = diversityTestConstraints;

    const search = new GeneticSearch();
    const results = await search.search(
      pool,
      constraints,
      preset,
      { maxResults: 20, populationSize: 200, generations: 500 },
    );

    // How diverse are the piece combos vs full loadout configs?
    const pieceKeys = new Set<string>();
    const fullKeys = new Set<string>();

    for (const r of results) {
      const pk = r.loadout.slots.map((s) => s.piece.id).join(",");
      const fk = r.loadout.slots.map((s) => {
        const parts = [s.piece.id, s.enchantment?.id ?? "none", s.modifier?.id ?? "none"];
        return parts.join(":");
      }).join(",");
      pieceKeys.add(pk);
      fullKeys.add(fk);
    }

    console.log(`[Dedup coverage] ${String(results.length)} results`);
    console.log(`  Unique piece combos: ${String(pieceKeys.size)}`);
    console.log(`  Unique full configs: ${String(fullKeys.size)}`);

    expect(results.length).toBeGreaterThan(0);
  });
});
