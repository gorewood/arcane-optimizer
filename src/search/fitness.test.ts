import { describe, expect, it } from "vitest";

import type { SoftConstraint, Stats } from "@/models/types";

import { emptyStats } from "./stats";
import { computeFitness, FITNESS_PRESETS, PRESET_NAMES } from "./fitness";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

/** Build a full Stats object with zeroes, overriding specific values. */
function makeStats(overrides?: Partial<Stats>): Stats {
  return { ...emptyStats(), ...overrides };
}

// ---------------------------------------------------------------------------
// computeFitness
// ---------------------------------------------------------------------------

describe("computeFitness", () => {
  // 1. Empty constraints returns 0
  it("returns 0 for empty constraints", () => {
    const stats = makeStats({ power: 100, defense: 500 });
    expect(computeFitness(stats, [])).toBe(0);
  });

  // 2. maximize — higher stat -> higher score
  it("maximize — higher stat yields higher score", () => {
    const c: SoftConstraint[] = [{ stat: "power", type: "maximize", weight: 10 }];
    const low = computeFitness(makeStats({ power: 50 }), c);
    const high = computeFitness(makeStats({ power: 100 }), c);
    expect(high).toBeGreaterThan(low);
  });

  // 3. minimize — higher stat -> lower score
  it("minimize — higher stat yields lower score", () => {
    const c: SoftConstraint[] = [{ stat: "drawback", type: "minimize", weight: 10 }];
    const low = computeFitness(makeStats({ drawback: 1 }), c);
    const high = computeFitness(makeStats({ drawback: 5 }), c);
    expect(low).toBeGreaterThan(high);
  });

  // 4. atLeast below threshold — heavy penalty
  it("atLeast below threshold applies heavy penalty", () => {
    const c: SoftConstraint[] = [{ stat: "defense", type: "atLeast", value: 700, weight: 100 }];
    const score = computeFitness(makeStats({ defense: 500 }), c);
    // Penalty: -(700 - 500) * 100 * 10 = -200_000
    expect(score).toBe(-200_000);
  });

  // 5. atLeast above threshold — small bonus
  it("atLeast above threshold applies small bonus", () => {
    const c: SoftConstraint[] = [{ stat: "defense", type: "atLeast", value: 700, weight: 100 }];
    const score = computeFitness(makeStats({ defense: 800 }), c);
    // Bonus: (800 - 700) * 100 * 0.1 = 1000
    expect(score).toBe(1000);
  });

  // 6. atLeast exactly at threshold — zero penalty, zero bonus
  it("atLeast exactly at threshold returns 0", () => {
    const c: SoftConstraint[] = [{ stat: "defense", type: "atLeast", value: 700, weight: 100 }];
    const score = computeFitness(makeStats({ defense: 700 }), c);
    expect(score).toBe(0);
  });

  // 7. atMost within limit — zero penalty
  it("atMost within limit returns 0", () => {
    const c: SoftConstraint[] = [{ stat: "drawback", type: "atMost", value: 2, weight: 100 }];
    const score = computeFitness(makeStats({ drawback: 1 }), c);
    expect(score).toBe(0);
  });

  // 8. atMost above limit — penalty
  it("atMost above limit applies penalty", () => {
    const c: SoftConstraint[] = [{ stat: "drawback", type: "atMost", value: 2, weight: 100 }];
    const score = computeFitness(makeStats({ drawback: 5 }), c);
    // Penalty: -(5 - 2) * 100 * 10 = -3000
    expect(score).toBe(-3000);
  });

  // 9. atMost with hardCap exceeded — returns -Infinity
  it("atMost with hardCap exceeded returns -Infinity", () => {
    const c: SoftConstraint[] = [
      { stat: "drawback", type: "atMost", value: 2, weight: 100, hardCap: 4 },
    ];
    const score = computeFitness(makeStats({ drawback: 5 }), c);
    expect(score).toBe(-Infinity);
  });

  // 10. target at target — zero penalty
  it("target at target value returns 0", () => {
    const c: SoftConstraint[] = [{ stat: "dexterity", type: "target", value: 300, weight: 80 }];
    const score = computeFitness(makeStats({ dexterity: 300 }), c);
    expect(score).toBe(0);
  });

  // 11. target above target — proportional penalty
  it("target above target applies proportional penalty", () => {
    const c: SoftConstraint[] = [{ stat: "dexterity", type: "target", value: 300, weight: 80 }];
    const score = computeFitness(makeStats({ dexterity: 350 }), c);
    // Penalty: -|350 - 300| * 80 = -4000
    expect(score).toBe(-4000);
  });

  // 12. target below target — proportional penalty
  it("target below target applies proportional penalty", () => {
    const c: SoftConstraint[] = [{ stat: "dexterity", type: "target", value: 300, weight: 80 }];
    const score = computeFitness(makeStats({ dexterity: 250 }), c);
    // Penalty: -|250 - 300| * 80 = -4000
    expect(score).toBe(-4000);
  });

  // 13. target with hardCap exceeded — returns -Infinity
  it("target with hardCap exceeded returns -Infinity", () => {
    const c: SoftConstraint[] = [
      { stat: "size", type: "target", value: 300, weight: 70, hardCap: 330 },
    ];
    const score = computeFitness(makeStats({ size: 350 }), c);
    expect(score).toBe(-Infinity);
  });

  // 14. exactly matching — no disqualification
  it("exactly matching value returns 0", () => {
    const c: SoftConstraint[] = [{ stat: "insanity", type: "exactly", value: 1, weight: 100 }];
    const score = computeFitness(makeStats({ insanity: 1 }), c);
    expect(score).toBe(0);
  });

  // 15. exactly not matching — returns -Infinity
  it("exactly not matching returns -Infinity", () => {
    const c: SoftConstraint[] = [{ stat: "insanity", type: "exactly", value: 1, weight: 100 }];
    const score = computeFitness(makeStats({ insanity: 2 }), c);
    expect(score).toBe(-Infinity);
  });

  // 16. Multiple constraints combine scores additively
  it("multiple constraints combine additively", () => {
    const constraints: SoftConstraint[] = [
      { stat: "power", type: "maximize", weight: 10 },
      { stat: "defense", type: "maximize", weight: 5 },
    ];
    const score = computeFitness(makeStats({ power: 100, defense: 200 }), constraints);
    // 100 * 10 + 200 * 5 = 2000
    expect(score).toBe(2000);
  });

  // 17. One -Infinity disqualifies the whole loadout
  it("one disqualifying constraint makes entire score -Infinity", () => {
    const constraints: SoftConstraint[] = [
      { stat: "power", type: "maximize", weight: 10 },
      { stat: "insanity", type: "exactly", value: 0, weight: 100 },
    ];
    const score = computeFitness(makeStats({ power: 999, insanity: 5 }), constraints);
    expect(score).toBe(-Infinity);
  });

  // 18. Default value (undefined) treated as 0
  it("undefined value defaults to 0", () => {
    const c: SoftConstraint[] = [{ stat: "insanity", type: "exactly", weight: 100 }];
    // value is undefined, defaults to 0 — stats.insanity is 0 too
    const score = computeFitness(makeStats(), c);
    expect(score).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Presets
// ---------------------------------------------------------------------------

describe("FITNESS_PRESETS", () => {
  // 19. Has 3 entries
  it("has exactly 3 presets", () => {
    expect(Object.keys(FITNESS_PRESETS)).toHaveLength(3);
  });

  // 20. Each preset has valid constraint structure
  it("each preset has valid constraint structure", () => {
    const validTypes = new Set([
      "minimize",
      "maximize",
      "atLeast",
      "atMost",
      "target",
      "exactly",
    ]);

    for (const [name, constraints] of Object.entries(FITNESS_PRESETS)) {
      expect(constraints.length).toBeGreaterThan(0);

      for (const c of constraints) {
        expect(c).toHaveProperty("stat");
        expect(c).toHaveProperty("type");
        expect(c).toHaveProperty("weight");
        expect(validTypes.has(c.type)).toBe(true);
        expect(typeof c.weight).toBe("number");
        expect(c.weight).toBeGreaterThan(0);

        // Constraints with value-dependent types should have value
        if (c.type === "atLeast" || c.type === "atMost" || c.type === "target" || c.type === "exactly") {
          expect(typeof c.value).toBe("number");
        }

        // name is used — suppress lint
        void name;
      }
    }
  });

  // 21. Mage Build scores higher for defense-heavy stats
  it("Mage Build scores higher for defense-heavy stats than low-defense stats", () => {
    const magePreset = FITNESS_PRESETS["Mage Build"];
    expect(magePreset).toBeDefined();

    const highDefense = makeStats({
      defense: 800,
      power: 120,
      dexterity: 300,
      size: 300,
      insanity: 1,
      drawback: 1,
    });

    const lowDefense = makeStats({
      defense: 200,
      power: 30,
      dexterity: 300,
      size: 300,
      insanity: 1,
      drawback: 1,
    });

    // Both satisfy exactly/atMost constraints; high-defense should score better
    if (magePreset == null) throw new Error("Mage Build preset missing");
    const highScore = computeFitness(highDefense, magePreset);
    const lowScore = computeFitness(lowDefense, magePreset);
    expect(highScore).toBeGreaterThan(lowScore);
  });
});

describe("PRESET_NAMES", () => {
  it("matches the keys of FITNESS_PRESETS", () => {
    expect(PRESET_NAMES).toEqual(Object.keys(FITNESS_PRESETS));
  });

  it("contains all 3 preset names", () => {
    expect(PRESET_NAMES).toHaveLength(3);
    expect(PRESET_NAMES).toContain("Mage Build");
    expect(PRESET_NAMES).toContain("Warrior Build");
    expect(PRESET_NAMES).toContain("Tank Build");
  });
});
