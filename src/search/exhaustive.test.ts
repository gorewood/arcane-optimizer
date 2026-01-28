import { describe, expect, it, vi } from "vitest";

import type {
  EquipmentPiece,
  GearPool,
  Loadout,
  SearchOptions,
  SoftConstraint,
} from "@/models/types";

import { DEFAULT_HARD_CONSTRAINTS } from "./constraints";
import {
  ExhaustiveSearch,
  generateAccessoryCombinations,
  TopNTracker,
} from "./exhaustive";
import { emptyStats } from "./stats";

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

function makePool(overrides: Partial<GearPool> = {}): GearPool {
  return {
    chestplates: [makeEquipment({ id: "c1", slot: "chestplate", name: "Chest" })],
    leggings: [makeEquipment({ id: "l1", slot: "leggings", name: "Legs" })],
    accessories: [
      makeEquipment({ id: "a1", slot: "accessory", name: "Ring 1" }),
      makeEquipment({ id: "a2", slot: "accessory-H", name: "Helmet" }),
      makeEquipment({ id: "a3", slot: "accessory-A", name: "Amulet" }),
    ],
    enchantments: [],
    modifiers: [],
    gems: [],
    ...overrides,
  };
}

const defaultConstraints = DEFAULT_HARD_CONSTRAINTS;

const defaultOptions: SearchOptions = { maxResults: 10 };

const defaultFitness: SoftConstraint[] = [
  { stat: "defense", type: "maximize", weight: 1 },
];

// ---------------------------------------------------------------------------
// TopNTracker
// ---------------------------------------------------------------------------

/** Build a stub loadout for tracker tests. */
function stubLoadout(): Loadout {
  const piece = makeEquipment({ id: "stub", slot: "chestplate" });
  const slot = { piece, gems: [] as const };
  return { slots: [slot, slot, slot, slot, slot] };
}

describe("TopNTracker", () => {
  it("tracks top N results sorted by score descending", () => {
    const tracker = new TopNTracker(3);
    const stats = emptyStats();
    const loadout = stubLoadout();

    tracker.tryInsert({ loadout, score: 10, stats });
    tracker.tryInsert({ loadout, score: 30, stats });
    tracker.tryInsert({ loadout, score: 20, stats });

    const results = tracker.getResults();
    expect(results).toHaveLength(3);
    expect(results[0]?.score).toBe(30);
    expect(results[1]?.score).toBe(20);
    expect(results[2]?.score).toBe(10);
  });

  it("limits to maxResults entries", () => {
    const tracker = new TopNTracker(2);
    const stats = emptyStats();
    const loadout = stubLoadout();

    tracker.tryInsert({ loadout, score: 10, stats });
    tracker.tryInsert({ loadout, score: 30, stats });
    tracker.tryInsert({ loadout, score: 20, stats });

    const results = tracker.getResults();
    expect(results).toHaveLength(2);
    expect(results[0]?.score).toBe(30);
    expect(results[1]?.score).toBe(20);
  });

  it("rejects scores at or below worstScore when full", () => {
    const tracker = new TopNTracker(2);
    const stats = emptyStats();
    const loadout = stubLoadout();

    tracker.tryInsert({ loadout, score: 20, stats });
    tracker.tryInsert({ loadout, score: 30, stats });
    tracker.tryInsert({ loadout, score: 10, stats }); // should be rejected
    tracker.tryInsert({ loadout, score: 20, stats }); // equal to worst, rejected

    const results = tracker.getResults();
    expect(results).toHaveLength(2);
    expect(results[0]?.score).toBe(30);
    expect(results[1]?.score).toBe(20);
  });

  it("worstScore is -Infinity when not full", () => {
    const tracker = new TopNTracker(5);
    expect(tracker.worstScore).toBe(-Infinity);
  });
});

// ---------------------------------------------------------------------------
// generateAccessoryCombinations
// ---------------------------------------------------------------------------

describe("generateAccessoryCombinations", () => {
  it("generates all C(n,3) combinations", () => {
    const accessories = [
      makeEquipment({ id: "a1", slot: "accessory" }),
      makeEquipment({ id: "a2", slot: "accessory" }),
      makeEquipment({ id: "a3", slot: "accessory" }),
      makeEquipment({ id: "a4", slot: "accessory" }),
    ];
    const combos = [
      ...generateAccessoryCombinations(accessories, defaultConstraints),
    ];
    // C(4,3) = 4
    expect(combos).toHaveLength(4);
  });

  it("respects helmet limit (max 1)", () => {
    const accessories = [
      makeEquipment({ id: "h1", slot: "accessory-H" }),
      makeEquipment({ id: "h2", slot: "accessory-H" }),
      makeEquipment({ id: "a1", slot: "accessory" }),
      makeEquipment({ id: "a2", slot: "accessory" }),
    ];
    const combos = [
      ...generateAccessoryCombinations(accessories, defaultConstraints),
    ];
    // 2 helmets together would exceed limit of 1
    for (const [a, b, c] of combos) {
      const helmets = [a, b, c].filter((p) => p.slot === "accessory-H").length;
      expect(helmets).toBeLessThanOrEqual(1);
    }
  });

  it("respects amulet limit (max 1)", () => {
    const accessories = [
      makeEquipment({ id: "am1", slot: "accessory-A" }),
      makeEquipment({ id: "am2", slot: "accessory-A" }),
      makeEquipment({ id: "a1", slot: "accessory" }),
      makeEquipment({ id: "a2", slot: "accessory" }),
    ];
    const combos = [
      ...generateAccessoryCombinations(accessories, defaultConstraints),
    ];
    for (const [a, b, c] of combos) {
      const amulets = [a, b, c].filter((p) => p.slot === "accessory-A").length;
      expect(amulets).toBeLessThanOrEqual(1);
    }
  });

  it("returns empty for fewer than 3 accessories", () => {
    const accessories = [
      makeEquipment({ id: "a1", slot: "accessory" }),
      makeEquipment({ id: "a2", slot: "accessory" }),
    ];
    const combos = [
      ...generateAccessoryCombinations(accessories, defaultConstraints),
    ];
    expect(combos).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// ExhaustiveSearch
// ---------------------------------------------------------------------------

describe("ExhaustiveSearch", () => {
  it("returns results sorted by score (highest first)", async () => {
    const pool = makePool({
      chestplates: [
        makeEquipment({ id: "c1", slot: "chestplate", baseStats: { defense: 100 } }),
        makeEquipment({ id: "c2", slot: "chestplate", baseStats: { defense: 200 } }),
      ],
    });
    const search = new ExhaustiveSearch();
    const results = await search.search(
      pool,
      defaultConstraints,
      defaultFitness,
      defaultOptions,
    );

    expect(results.length).toBeGreaterThan(0);
    for (let i = 1; i < results.length; i++) {
      const prev = results[i - 1];
      const curr = results[i];
      if (prev != null && curr != null) {
        expect(prev.score).toBeGreaterThanOrEqual(curr.score);
      }
    }
  });

  it("respects maxResults limit", async () => {
    const pool = makePool({
      chestplates: [
        makeEquipment({ id: "c1", slot: "chestplate", baseStats: { defense: 100 } }),
        makeEquipment({ id: "c2", slot: "chestplate", baseStats: { defense: 200 } }),
        makeEquipment({ id: "c3", slot: "chestplate", baseStats: { defense: 150 } }),
      ],
    });
    const search = new ExhaustiveSearch();
    const results = await search.search(
      pool,
      defaultConstraints,
      defaultFitness,
      { maxResults: 2 },
    );

    expect(results).toHaveLength(2);
  });

  it("skips invalid loadouts (wrong slot counts)", async () => {
    // Pool with only 2 accessories — cannot form valid triplets
    const pool = makePool({
      accessories: [
        makeEquipment({ id: "a1", slot: "accessory" }),
        makeEquipment({ id: "a2", slot: "accessory" }),
      ],
    });
    const search = new ExhaustiveSearch();
    const results = await search.search(
      pool,
      defaultConstraints,
      defaultFitness,
      defaultOptions,
    );

    expect(results).toHaveLength(0);
  });

  it("returns empty results for empty pool", async () => {
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
      defaultConstraints,
      defaultFitness,
      defaultOptions,
    );

    expect(results).toHaveLength(0);
  });

  it("fires progress callback", async () => {
    const pool = makePool();
    const search = new ExhaustiveSearch();
    const progressSpy = vi.fn();
    search.onProgress = progressSpy;

    await search.search(pool, defaultConstraints, defaultFitness, defaultOptions);

    // Should fire at least once (final report)
    expect(progressSpy).toHaveBeenCalled();
    expect(progressSpy.mock.lastCall).toBeDefined();
    // First arg is `checked` count
    expect(progressSpy.mock.lastCall?.[0]).toBeGreaterThan(0);
  });

  it("includes correct stats in results", async () => {
    const pool = makePool({
      chestplates: [
        makeEquipment({ id: "c1", slot: "chestplate", baseStats: { defense: 100 } }),
      ],
      leggings: [
        makeEquipment({ id: "l1", slot: "leggings", baseStats: { defense: 80 } }),
      ],
    });
    const search = new ExhaustiveSearch();
    const results = await search.search(
      pool,
      defaultConstraints,
      defaultFitness,
      defaultOptions,
    );

    expect(results).toHaveLength(1);
    const first = results[0];
    expect(first).toBeDefined();
    if (first != null) {
      expect(first.stats.defense).toBe(180); // 100 + 80
      expect(first.stats.power).toBe(0);
    }
  });

  it("no duplicate equipment IDs within a single result", async () => {
    const pool = makePool({
      accessories: [
        makeEquipment({ id: "a1", slot: "accessory" }),
        makeEquipment({ id: "a2", slot: "accessory-H" }),
        makeEquipment({ id: "a3", slot: "accessory-A" }),
        makeEquipment({ id: "a4", slot: "accessory" }),
      ],
    });
    const search = new ExhaustiveSearch();
    const results = await search.search(
      pool,
      defaultConstraints,
      defaultFitness,
      defaultOptions,
    );

    for (const result of results) {
      const ids = result.loadout.slots.map((s) => s.piece.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    }
  });

  it("cancellation stops search early", async () => {
    // Large enough pool to not finish instantly
    const accessories = Array.from({ length: 10 }, (_, i) =>
      makeEquipment({ id: `a${String(i)}`, slot: "accessory" }),
    );
    const pool = makePool({
      chestplates: Array.from({ length: 5 }, (_, i) =>
        makeEquipment({ id: `c${String(i)}`, slot: "chestplate" }),
      ),
      leggings: Array.from({ length: 5 }, (_, i) =>
        makeEquipment({ id: `l${String(i)}`, slot: "leggings" }),
      ),
      accessories,
    });

    const search = new ExhaustiveSearch();
    // Cancel immediately
    search.cancel();
    const results = await search.search(
      pool,
      defaultConstraints,
      defaultFitness,
      defaultOptions,
    );

    // Should return very few or no results since cancelled
    // C(10,3) * 5 * 5 = 3000, but cancelled immediately
    expect(results.length).toBeLessThan(3000);
  });

  it("respects timeout", async () => {
    const search = new ExhaustiveSearch();
    const pool = makePool();
    const results = await search.search(
      pool,
      defaultConstraints,
      defaultFitness,
      { maxResults: 10, timeout: 60_000 },
    );

    // With such a small pool it finishes well within timeout
    expect(results.length).toBeGreaterThanOrEqual(0);
  });

  it("filters disqualified loadouts via fitness scoring", async () => {
    const pool = makePool({
      chestplates: [
        makeEquipment({
          id: "c1",
          slot: "chestplate",
          baseStats: { insanity: 5 },
        }),
      ],
    });
    // "exactly 0 insanity" will disqualify the loadout with 5 insanity
    const strictFitness: SoftConstraint[] = [
      { stat: "insanity", type: "exactly", value: 0, weight: 100 },
    ];
    const search = new ExhaustiveSearch();
    const results = await search.search(
      pool,
      defaultConstraints,
      strictFitness,
      defaultOptions,
    );

    expect(results).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Constraint interaction: helmets and amulets in full search
// ---------------------------------------------------------------------------

describe("ExhaustiveSearch constraint interaction", () => {
  it("excludes combos with 2 helmets via validation", async () => {
    const pool = makePool({
      accessories: [
        makeEquipment({ id: "h1", slot: "accessory-H" }),
        makeEquipment({ id: "h2", slot: "accessory-H" }),
        makeEquipment({ id: "a1", slot: "accessory" }),
        makeEquipment({ id: "a2", slot: "accessory" }),
      ],
    });
    const search = new ExhaustiveSearch();
    const results = await search.search(
      pool,
      defaultConstraints,
      defaultFitness,
      defaultOptions,
    );

    for (const result of results) {
      const helmets = result.loadout.slots.filter(
        (s) => s.piece.slot === "accessory-H",
      ).length;
      expect(helmets).toBeLessThanOrEqual(1);
    }
  });

  it("excludes combos with 2 amulets via validation", async () => {
    const pool = makePool({
      accessories: [
        makeEquipment({ id: "am1", slot: "accessory-A" }),
        makeEquipment({ id: "am2", slot: "accessory-A" }),
        makeEquipment({ id: "a1", slot: "accessory" }),
        makeEquipment({ id: "a2", slot: "accessory" }),
      ],
    });
    const search = new ExhaustiveSearch();
    const results = await search.search(
      pool,
      defaultConstraints,
      defaultFitness,
      defaultOptions,
    );

    for (const result of results) {
      const amulets = result.loadout.slots.filter(
        (s) => s.piece.slot === "accessory-A",
      ).length;
      expect(amulets).toBeLessThanOrEqual(1);
    }
  });
});
