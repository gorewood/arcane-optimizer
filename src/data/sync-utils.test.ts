/**
 * Tests for sync utility functions.
 */

import { describe, it, expect } from "vitest";
import {
  normalizeItemName,
  detectEquipmentDuplicates,
  detectNamedDuplicates,
  getEffectivePurpose,
  computeBundledDiff,
  categorizeUserItems,
} from "./sync-utils";
import type { EquipmentPiece, Enchantment } from "@/models/types";
import type { UserItemRecord } from "./user-data-types";

// ---------------------------------------------------------------------------
// Test Fixtures
// ---------------------------------------------------------------------------

/** Creates a minimal valid EquipmentPiece for testing. */
function makeEquipment(overrides: {
  id: string;
  name: string;
  slot: EquipmentPiece["slot"];
}): EquipmentPiece {
  return {
    id: overrides.id,
    name: overrides.name,
    slot: overrides.slot,
    baseStats: {},
    socketCount: 0,
    maxLevel: 1,
    tags: [],
  };
}

/** Creates a minimal valid Enchantment for testing. */
function makeEnchantment(overrides: { id: string; name: string; stats?: Enchantment["stats"] }): Enchantment {
  return {
    id: overrides.id,
    name: overrides.name,
    tier: 1,
    applicableTo: ["armor"],
    stats: overrides.stats ?? {},
  };
}

// ---------------------------------------------------------------------------
// normalizeItemName
// ---------------------------------------------------------------------------

describe("normalizeItemName", () => {
  it("converts to lowercase", () => {
    expect(normalizeItemName("Cernyx Helmet")).toBe("cernyx helmet");
  });

  it("trims whitespace", () => {
    expect(normalizeItemName("  Cernyx Helmet  ")).toBe("cernyx helmet");
  });

  it("strips possessive 's", () => {
    expect(normalizeItemName("Cernyx's Helmet")).toBe("cernyx helmet");
  });

  it("strips trailing apostrophe", () => {
    expect(normalizeItemName("Cernyx' Helmet")).toBe("cernyx helmet");
  });

  it("collapses multiple spaces", () => {
    expect(normalizeItemName("Cernyx   Helmet")).toBe("cernyx helmet");
  });

  it("handles combined transformations", () => {
    expect(normalizeItemName("  Cernyx's   Helmet  ")).toBe("cernyx helmet");
  });

  it("handles empty string", () => {
    expect(normalizeItemName("")).toBe("");
  });

  it("handles no transformations needed", () => {
    expect(normalizeItemName("cernyx helmet")).toBe("cernyx helmet");
  });
});

// ---------------------------------------------------------------------------
// getEffectivePurpose
// ---------------------------------------------------------------------------

describe("getEffectivePurpose", () => {
  it("returns 'contribution' when purpose is undefined", () => {
    const record: UserItemRecord<unknown> = {
      id: "test",
      createdAt: 0,
      updatedAt: 0,
    };
    expect(getEffectivePurpose(record)).toBe("contribution");
  });

  it("returns 'contribution' when purpose is 'contribution'", () => {
    const record: UserItemRecord<unknown> = {
      id: "test",
      purpose: "contribution",
      createdAt: 0,
      updatedAt: 0,
    };
    expect(getEffectivePurpose(record)).toBe("contribution");
  });

  it("returns 'custom' when purpose is 'custom'", () => {
    const record: UserItemRecord<unknown> = {
      id: "test",
      purpose: "custom",
      createdAt: 0,
      updatedAt: 0,
    };
    expect(getEffectivePurpose(record)).toBe("custom");
  });
});

// ---------------------------------------------------------------------------
// detectEquipmentDuplicates
// ---------------------------------------------------------------------------

describe("detectEquipmentDuplicates", () => {
  const bundledEquipment: EquipmentPiece[] = [
    makeEquipment({ id: "cernyx-helmet", name: "Cernyx Helmet", slot: "accessory-H" }),
    makeEquipment({ id: "cernyx-armor", name: "Cernyx Armor", slot: "chestplate" }),
  ];

  it("detects exact name match", () => {
    const userRecords: UserItemRecord<EquipmentPiece>[] = [
      {
        id: "user-1",
        data: makeEquipment({ id: "user-1", name: "Cernyx Helmet", slot: "accessory-H" }),
        createdAt: 0,
        updatedAt: 0,
      },
    ];

    const matches = detectEquipmentDuplicates(userRecords, bundledEquipment);
    expect(matches).toHaveLength(1);
    expect(matches[0]).toEqual({
      userItemId: "user-1",
      bundledItemId: "cernyx-helmet",
      bundledItemName: "Cernyx Helmet",
    });
  });

  it("detects normalized name match (possessive)", () => {
    const userRecords: UserItemRecord<EquipmentPiece>[] = [
      {
        id: "user-1",
        data: makeEquipment({ id: "user-1", name: "Cernyx's Helmet", slot: "accessory-H" }),
        createdAt: 0,
        updatedAt: 0,
      },
    ];

    const matches = detectEquipmentDuplicates(userRecords, bundledEquipment);
    expect(matches).toHaveLength(1);
  });

  it("requires slot match", () => {
    const userRecords: UserItemRecord<EquipmentPiece>[] = [
      {
        id: "user-1",
        data: makeEquipment({ id: "user-1", name: "Cernyx Helmet", slot: "chestplate" }), // Wrong slot
        createdAt: 0,
        updatedAt: 0,
      },
    ];

    const matches = detectEquipmentDuplicates(userRecords, bundledEquipment);
    expect(matches).toHaveLength(0);
  });

  it("skips custom items", () => {
    const userRecords: UserItemRecord<EquipmentPiece>[] = [
      {
        id: "user-1",
        data: makeEquipment({ id: "user-1", name: "Cernyx Helmet", slot: "accessory-H" }),
        purpose: "custom",
        createdAt: 0,
        updatedAt: 0,
      },
    ];

    const matches = detectEquipmentDuplicates(userRecords, bundledEquipment);
    expect(matches).toHaveLength(0);
  });

  it("skips deleted records", () => {
    const userRecords: UserItemRecord<EquipmentPiece>[] = [
      {
        id: "user-1",
        data: makeEquipment({ id: "user-1", name: "Cernyx Helmet", slot: "accessory-H" }),
        deleted: true,
        createdAt: 0,
        updatedAt: 0,
      },
    ];

    const matches = detectEquipmentDuplicates(userRecords, bundledEquipment);
    expect(matches).toHaveLength(0);
  });

  it("skips records without data", () => {
    const userRecords: UserItemRecord<EquipmentPiece>[] = [
      {
        id: "user-1",
        deleted: true, // Delete marker only
        createdAt: 0,
        updatedAt: 0,
      },
    ];

    const matches = detectEquipmentDuplicates(userRecords, bundledEquipment);
    expect(matches).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// detectNamedDuplicates
// ---------------------------------------------------------------------------

describe("detectNamedDuplicates", () => {
  const bundledEnchantments: Enchantment[] = [
    makeEnchantment({ id: "powerful", name: "Powerful", stats: { power: 10 } }),
    makeEnchantment({ id: "hard", name: "Hard", stats: { defense: 10 } }),
  ];

  it("detects exact name match", () => {
    const userRecords: UserItemRecord<Enchantment>[] = [
      {
        id: "user-1",
        data: makeEnchantment({ id: "user-1", name: "Powerful", stats: { power: 15 } }),
        createdAt: 0,
        updatedAt: 0,
      },
    ];

    const matches = detectNamedDuplicates(userRecords, bundledEnchantments);
    expect(matches).toHaveLength(1);
    expect(matches[0]?.bundledItemName).toBe("Powerful");
  });

  it("detects case-insensitive match", () => {
    const userRecords: UserItemRecord<Enchantment>[] = [
      {
        id: "user-1",
        data: makeEnchantment({ id: "user-1", name: "POWERFUL", stats: { power: 15 } }),
        createdAt: 0,
        updatedAt: 0,
      },
    ];

    const matches = detectNamedDuplicates(userRecords, bundledEnchantments);
    expect(matches).toHaveLength(1);
  });

  it("skips custom items", () => {
    const userRecords: UserItemRecord<Enchantment>[] = [
      {
        id: "user-1",
        data: makeEnchantment({ id: "user-1", name: "Powerful", stats: { power: 15 } }),
        purpose: "custom",
        createdAt: 0,
        updatedAt: 0,
      },
    ];

    const matches = detectNamedDuplicates(userRecords, bundledEnchantments);
    expect(matches).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// computeBundledDiff
// ---------------------------------------------------------------------------

describe("computeBundledDiff", () => {
  it("detects added items", () => {
    const oldItems = [{ id: "a", name: "Item A" }];
    const newItems = [
      { id: "a", name: "Item A" },
      { id: "b", name: "Item B" },
    ];

    const diff = computeBundledDiff(oldItems, newItems);
    expect(diff.added).toHaveLength(1);
    expect(diff.added[0]?.name).toBe("Item B");
    expect(diff.modified).toHaveLength(0);
    expect(diff.removed).toHaveLength(0);
  });

  it("detects modified items", () => {
    const oldItems = [{ id: "a", name: "Item A", value: 1 }];
    const newItems = [{ id: "a", name: "Item A", value: 2 }];

    const diff = computeBundledDiff(oldItems, newItems);
    expect(diff.added).toHaveLength(0);
    expect(diff.modified).toHaveLength(1);
    expect(diff.modified[0]).toEqual({ id: "a", name: "Item A", value: 2 });
    expect(diff.removed).toHaveLength(0);
  });

  it("detects removed items", () => {
    const oldItems = [
      { id: "a", name: "Item A" },
      { id: "b", name: "Item B" },
    ];
    const newItems = [{ id: "a", name: "Item A" }];

    const diff = computeBundledDiff(oldItems, newItems);
    expect(diff.added).toHaveLength(0);
    expect(diff.modified).toHaveLength(0);
    expect(diff.removed).toHaveLength(1);
    expect(diff.removed[0]?.name).toBe("Item B");
  });

  it("handles all changes at once", () => {
    const oldItems = [
      { id: "a", name: "Item A", value: 1 },
      { id: "b", name: "Item B" },
    ];
    const newItems = [
      { id: "a", name: "Item A", value: 2 }, // Modified
      { id: "c", name: "Item C" }, // Added (b removed)
    ];

    const diff = computeBundledDiff(oldItems, newItems);
    expect(diff.added).toHaveLength(1);
    expect(diff.modified).toHaveLength(1);
    expect(diff.removed).toHaveLength(1);
  });

  it("handles empty arrays", () => {
    const diff = computeBundledDiff([], []);
    expect(diff.added).toHaveLength(0);
    expect(diff.modified).toHaveLength(0);
    expect(diff.removed).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// categorizeUserItems
// ---------------------------------------------------------------------------

describe("categorizeUserItems", () => {
  it("categorizes duplicates correctly", () => {
    const records: UserItemRecord<{ id: string; name: string }>[] = [
      { id: "user-1", data: { id: "user-1", name: "A" }, createdAt: 0, updatedAt: 0 },
    ];
    const duplicateIds = new Set(["user-1"]);

    const result = categorizeUserItems(records, duplicateIds);
    expect(result.duplicates).toHaveLength(1);
    expect(result.orphanContributions).toHaveLength(0);
    expect(result.customItems).toHaveLength(0);
  });

  it("categorizes orphan contributions correctly", () => {
    const records: UserItemRecord<{ id: string; name: string }>[] = [
      { id: "user-1", data: { id: "user-1", name: "A" }, createdAt: 0, updatedAt: 0 },
    ];
    const duplicateIds = new Set<string>(); // No duplicates

    const result = categorizeUserItems(records, duplicateIds);
    expect(result.duplicates).toHaveLength(0);
    expect(result.orphanContributions).toHaveLength(1);
    expect(result.customItems).toHaveLength(0);
  });

  it("categorizes custom items correctly", () => {
    const records: UserItemRecord<{ id: string; name: string }>[] = [
      { id: "user-1", data: { id: "user-1", name: "A" }, purpose: "custom", createdAt: 0, updatedAt: 0 },
    ];
    const duplicateIds = new Set(["user-1"]); // Would be duplicate if not custom

    const result = categorizeUserItems(records, duplicateIds);
    expect(result.duplicates).toHaveLength(0);
    expect(result.orphanContributions).toHaveLength(0);
    expect(result.customItems).toHaveLength(1);
  });

  it("skips records without data", () => {
    const records: UserItemRecord<{ id: string; name: string }>[] = [
      { id: "user-1", deleted: true, createdAt: 0, updatedAt: 0 }, // Delete marker only
    ];
    const duplicateIds = new Set<string>();

    const result = categorizeUserItems(records, duplicateIds);
    expect(result.duplicates).toHaveLength(0);
    expect(result.orphanContributions).toHaveLength(0);
    expect(result.customItems).toHaveLength(0);
  });

  it("skips soft-deleted records", () => {
    const records: UserItemRecord<{ id: string; name: string }>[] = [
      { id: "user-1", data: { id: "user-1", name: "A" }, deleted: true, createdAt: 0, updatedAt: 0 },
    ];
    const duplicateIds = new Set<string>();

    const result = categorizeUserItems(records, duplicateIds);
    expect(result.duplicates).toHaveLength(0);
    expect(result.orphanContributions).toHaveLength(0);
    expect(result.customItems).toHaveLength(0);
  });
});
