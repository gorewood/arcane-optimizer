import { describe, expect, it } from "vitest";

import type { SoftConstraint, Stats } from "@/models/types";
import { getTestProfileNames, getTestProfiles } from "@/test/profile-fixtures";

import { emptyStats } from "./stats";
import { computeFitness } from "./fitness";

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

  // 4. atLeast below threshold — soft penalty in linear mode
  it("atLeast below threshold applies negative penalty", () => {
    const c: SoftConstraint[] = [{ stat: "defense", type: "atLeast", value: 700, weight: 100 }];
    const score = computeFitness(makeStats({ defense: 500 }), c);
    // Soft penalty: -((700 - 500) * 100 * 10) = -200000
    // This allows builds to still be considered, just with lower scores
    expect(score).toBe(-200000);
  });

  // 5. atLeast above threshold — small bonus (capped at 1× weight)
  it("atLeast above threshold applies small bonus", () => {
    const c: SoftConstraint[] = [{ stat: "defense", type: "atLeast", value: 700, weight: 100 }];
    const score = computeFitness(makeStats({ defense: 800 }), c);
    // Bonus: min((800 - 700) * 100 * 0.1, 100) = min(1000, 100) = 100 (capped)
    expect(score).toBe(100);
  });

  // 6. atLeast exactly at threshold — zero penalty, zero bonus
  it("atLeast exactly at threshold returns 0", () => {
    const c: SoftConstraint[] = [{ stat: "defense", type: "atLeast", value: 700, weight: 100 }];
    const score = computeFitness(makeStats({ defense: 700 }), c);
    expect(score).toBe(0);
  });

  // 6b. atLeast below threshold in efficiency mode — hard disqualification
  it("atLeast below threshold disqualifies in efficiency mode", () => {
    const c: SoftConstraint[] = [{ stat: "defense", type: "atLeast", value: 700, weight: 100 }];
    const score = computeFitness(makeStats({ defense: 500 }), c, "efficiency");
    // In efficiency/multiplier modes, atLeast is a hard constraint
    expect(score).toBe(-Infinity);
  });

  // 7. atMost within limit — zero penalty
  it("atMost within limit returns 0", () => {
    const c: SoftConstraint[] = [{ stat: "drawback", type: "atMost", value: 2, weight: 100 }];
    const score = computeFitness(makeStats({ drawback: 1 }), c);
    expect(score).toBe(0);
  });

  // 8. atMost exceeded — returns -Infinity (value is hard limit)
  it("atMost exceeded returns -Infinity", () => {
    const c: SoftConstraint[] = [
      { stat: "drawback", type: "atMost", value: 2, weight: 100 },
    ];
    const score = computeFitness(makeStats({ drawback: 3 }), c);
    expect(score).toBe(-Infinity);
  });

  // 10. between — in range returns 0
  it("between in range returns 0", () => {
    const c: SoftConstraint[] = [{ stat: "dexterity", type: "between", value: 280, weight: 80, hardCap: 320 }];
    const score = computeFitness(makeStats({ dexterity: 300 }), c);
    expect(score).toBe(0);
  });

  // 11. between — below range applies penalty
  it("between below range applies penalty", () => {
    const c: SoftConstraint[] = [{ stat: "dexterity", type: "between", value: 280, weight: 80, hardCap: 320 }];
    const score = computeFitness(makeStats({ dexterity: 260 }), c);
    // Penalty: -(280 - 260) * 80 * 10 = -16000
    expect(score).toBe(-16000);
  });

  // 12. between — above range applies penalty
  it("between above range applies penalty", () => {
    const c: SoftConstraint[] = [{ stat: "dexterity", type: "between", value: 280, weight: 80, hardCap: 320 }];
    const score = computeFitness(makeStats({ dexterity: 350 }), c);
    // Penalty: -(350 - 320) * 80 * 10 = -24000
    expect(score).toBe(-24000);
  });

  // 13. exactly matching — small bonus (weight-based tie-breaker)
  it("exactly matching value returns small bonus", () => {
    const c: SoftConstraint[] = [{ stat: "insanity", type: "exactly", value: 1, weight: 100 }];
    const score = computeFitness(makeStats({ insanity: 1 }), c);
    // Bonus: weight * 0.01 = 1
    expect(score).toBe(1);
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
    // exactly match returns weight * 0.01 = 1
    const score = computeFitness(makeStats(), c);
    expect(score).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Default Profiles
// ---------------------------------------------------------------------------

describe("Default Profiles", () => {
  const TEST_PROFILES = getTestProfiles();
  const TEST_PROFILE_NAMES = getTestProfileNames();

  // 19. Has 5 entries (3 original + 2 new scoring mode profiles)
  it("has exactly 5 profiles", () => {
    expect(Object.keys(TEST_PROFILES)).toHaveLength(5);
  });

  // 20. Each profile has valid constraint structure
  it("each profile has valid constraint structure", () => {
    const validTypes = new Set([
      "minimize",
      "maximize",
      "atLeast",
      "atMost",
      "between",
      "exactly",
    ]);

    for (const [name, constraints] of Object.entries(TEST_PROFILES)) {
      expect(constraints.length).toBeGreaterThan(0);

      for (const c of constraints) {
        expect(c).toHaveProperty("stat");
        expect(c).toHaveProperty("type");
        expect(c).toHaveProperty("weight");
        expect(validTypes.has(c.type)).toBe(true);
        expect(typeof c.weight).toBe("number");
        expect(c.weight).toBeGreaterThan(0);

        // Constraints with value-dependent types should have value
        if (c.type === "atLeast" || c.type === "atMost" || c.type === "between" || c.type === "exactly") {
          expect(typeof c.value).toBe("number");
        }

        // name is used — suppress lint
        void name;
      }
    }
  });

  // 21. First profile (Dexterity Mage) scores higher for defense-heavy stats
  it("first profile scores higher for defense-heavy stats than low-defense stats", () => {
    const firstProfile = TEST_PROFILES[TEST_PROFILE_NAMES[0] ?? ""];
    expect(firstProfile).toBeDefined();

    const highDefense = makeStats({
      defense: 1100,
      power: 130,
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
    if (firstProfile == null) throw new Error("First profile missing");
    const highScore = computeFitness(highDefense, firstProfile);
    const lowScore = computeFitness(lowDefense, firstProfile);
    expect(highScore).toBeGreaterThan(lowScore);
  });
});

describe("Profile Names", () => {
  const TEST_PROFILES = getTestProfiles();
  const TEST_PROFILE_NAMES = getTestProfileNames();

  it("matches the keys of profiles", () => {
    expect(TEST_PROFILE_NAMES).toEqual(Object.keys(TEST_PROFILES));
  });

  it("contains all 5 profile names", () => {
    expect(TEST_PROFILE_NAMES).toHaveLength(5);
  });
});
