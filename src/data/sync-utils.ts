/**
 * Pure utility functions for data sync operations.
 *
 * Handles name normalization, duplicate detection, and bundled data diffing.
 */

import type { EquipmentPiece } from "@/models/types";
import type { UserItemRecord, ItemPurpose } from "./user-data-types";
import type { ChangelogEntry } from "./user-data-schemas";

// ---------------------------------------------------------------------------
// Name Normalization
// ---------------------------------------------------------------------------

/**
 * Normalizes an item name for duplicate detection.
 *
 * - Converts to lowercase
 * - Trims whitespace
 * - Strips possessives ('s, ')
 * - Collapses multiple spaces
 */
export function normalizeItemName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/'s\b/g, "") // Remove possessive 's (e.g., "Cernyx's" → "Cernyx")
    .replace(/'\s/g, " ") // Remove apostrophe before space (e.g., "Cernyx' " → "Cernyx ")
    .replace(/\s+/g, " ") // Collapse multiple spaces
    .trim(); // Trim again after replacements
}

// ---------------------------------------------------------------------------
// Duplicate Detection
// ---------------------------------------------------------------------------

/** Item with name for duplicate detection. */
interface NamedItem {
  readonly id: string;
  readonly name: string;
}

/** Equipment item for duplicate detection (includes slot). */
interface EquipmentLikeItem extends NamedItem {
  readonly slot: string;
}

/** Result of duplicate detection. */
export interface DuplicateMatch {
  readonly userItemId: string;
  readonly bundledItemId: string;
  readonly bundledItemName: string;
}

/**
 * Detects duplicates between user contribution items and bundled items.
 *
 * For equipment: matches on normalized name + slot.
 * For other items: matches on normalized name only.
 */
export function detectEquipmentDuplicates(
  userRecords: readonly UserItemRecord<EquipmentPiece>[],
  bundledItems: readonly EquipmentPiece[]
): DuplicateMatch[] {
  const matches: DuplicateMatch[] = [];

  // Build lookup map: normalized "name|slot" → bundled item
  const bundledLookup = new Map<string, EquipmentLikeItem>();
  for (const item of bundledItems) {
    const key = `${normalizeItemName(item.name)}|${item.slot}`;
    bundledLookup.set(key, item);
  }

  // Check each contribution record
  for (const record of userRecords) {
    if (record.deleted === true) continue;
    if (record.data === undefined) continue;
    if (getEffectivePurpose(record) !== "contribution") continue;

    const key = `${normalizeItemName(record.data.name)}|${record.data.slot}`;
    const bundled = bundledLookup.get(key);
    if (bundled !== undefined) {
      matches.push({
        userItemId: record.id,
        bundledItemId: bundled.id,
        bundledItemName: bundled.name,
      });
    }
  }

  return matches;
}

/**
 * Detects duplicates for simple named items (enchantments, modifiers, gems).
 */
export function detectNamedDuplicates<T extends NamedItem>(
  userRecords: readonly UserItemRecord<T>[],
  bundledItems: readonly T[]
): DuplicateMatch[] {
  const matches: DuplicateMatch[] = [];

  // Build lookup map: normalized name → bundled item
  const bundledLookup = new Map<string, NamedItem>();
  for (const item of bundledItems) {
    bundledLookup.set(normalizeItemName(item.name), item);
  }

  // Check each contribution record
  for (const record of userRecords) {
    if (record.deleted === true) continue;
    if (record.data === undefined) continue;
    if (getEffectivePurpose(record) !== "contribution") continue;

    const bundled = bundledLookup.get(normalizeItemName(record.data.name));
    if (bundled !== undefined) {
      matches.push({
        userItemId: record.id,
        bundledItemId: bundled.id,
        bundledItemName: bundled.name,
      });
    }
  }

  return matches;
}

/**
 * Gets the effective purpose of a user item record.
 * Defaults to "contribution" if not specified.
 */
export function getEffectivePurpose<T>(record: UserItemRecord<T>): ItemPurpose {
  return record.purpose ?? "contribution";
}

// ---------------------------------------------------------------------------
// Bundled Data Diff
// ---------------------------------------------------------------------------

/** Diff between two versions of bundled data. */
export interface BundledDiff<T extends NamedItem> {
  readonly added: readonly T[];
  readonly modified: readonly T[];
  readonly removed: readonly T[];
}

/**
 * Computes the diff between old and new bundled items.
 *
 * Uses ID for matching, not name (since IDs are stable).
 */
export function computeBundledDiff<T extends NamedItem>(
  oldItems: readonly T[],
  newItems: readonly T[]
): BundledDiff<T> {
  const oldMap = new Map(oldItems.map((item) => [item.id, item]));
  const newMap = new Map(newItems.map((item) => [item.id, item]));

  const added: T[] = [];
  const modified: T[] = [];
  const removed: T[] = [];

  // Find added and modified
  for (const [id, newItem] of newMap) {
    const oldItem = oldMap.get(id);
    if (oldItem === undefined) {
      added.push(newItem);
    } else if (!itemsEqual(oldItem, newItem)) {
      modified.push(newItem);
    }
  }

  // Find removed
  for (const [id, oldItem] of oldMap) {
    if (!newMap.has(id)) {
      removed.push(oldItem);
    }
  }

  return { added, modified, removed };
}

/**
 * Simple equality check for items (JSON stringify comparison).
 * Sufficient for detecting modifications in bundled data.
 */
function itemsEqual<T>(a: T, b: T): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

// ---------------------------------------------------------------------------
// User Item Categorization
// ---------------------------------------------------------------------------

/** Categorized user items for sync dialog. */
export interface CategorizedUserItems<T> {
  /** Contributions that match bundled items (will be purged). */
  readonly duplicates: readonly UserItemRecord<T>[];
  /** Contributions that don't match bundled items (kept). */
  readonly orphanContributions: readonly UserItemRecord<T>[];
  /** Custom items (always kept). */
  readonly customItems: readonly UserItemRecord<T>[];
}

/**
 * Categorizes user item records for the sync dialog.
 */
export function categorizeUserItems<T extends NamedItem>(
  userRecords: readonly UserItemRecord<T>[],
  duplicateIds: ReadonlySet<string>
): CategorizedUserItems<T> {
  const duplicates: UserItemRecord<T>[] = [];
  const orphanContributions: UserItemRecord<T>[] = [];
  const customItems: UserItemRecord<T>[] = [];

  for (const record of userRecords) {
    // Skip delete markers (no data)
    if (record.data === undefined) continue;
    // Skip soft-deleted items
    if (record.deleted === true) continue;

    const purpose = getEffectivePurpose(record);

    if (purpose === "custom") {
      customItems.push(record);
    } else if (duplicateIds.has(record.id)) {
      duplicates.push(record);
    } else {
      orphanContributions.push(record);
    }
  }

  return { duplicates, orphanContributions, customItems };
}

// ---------------------------------------------------------------------------
// Sync Summary (for dialog display)
// ---------------------------------------------------------------------------

/** Summary of sync operation for dialog display. */
export interface SyncSummary {
  readonly bundledChanges: {
    readonly added: number;
    readonly modified: number;
    readonly removed: number;
  };
  readonly userItems: {
    readonly duplicates: number;
    readonly orphanContributions: number;
    readonly customItems: number;
  };
  readonly changelog: ChangelogEntry | undefined;
}

/**
 * Builds a sync summary for dialog display.
 */
export function buildSyncSummary(
  bundledDiff: BundledDiff<NamedItem>,
  categorized: CategorizedUserItems<NamedItem>,
  changelog: ChangelogEntry | undefined
): SyncSummary {
  return {
    bundledChanges: {
      added: bundledDiff.added.length,
      modified: bundledDiff.modified.length,
      removed: bundledDiff.removed.length,
    },
    userItems: {
      duplicates: categorized.duplicates.length,
      orphanContributions: categorized.orphanContributions.length,
      customItems: categorized.customItems.length,
    },
    changelog,
  };
}
