/**
 * Pure functions for merging bundled game data with user overrides.
 *
 * These functions combine bundled data (from JSON files) with user records
 * (from localStorage) to produce merged views for the UI.
 */

import type {
  VariantTypeEntry,
  VariantTypes,
} from "@/models/types";
import type {
  UserItemRecord,
  UserVariantTypes,
  MergedItem,
} from "./user-data-types";

// ---------------------------------------------------------------------------
// Item Merging
// ---------------------------------------------------------------------------

/**
 * Creates a map of user records by ID for efficient lookup.
 */
function createRecordMap<T>(
  records: readonly UserItemRecord<T>[],
): ReadonlyMap<string, UserItemRecord<T>> {
  return new Map(records.map((r) => [r.id, r]));
}

/**
 * Merges bundled items with user records to produce active items.
 *
 * Returns only non-deleted items for normal display.
 *
 * @param bundled - Items from bundled game data
 * @param userRecords - User override records
 * @returns Merged items (excluding deleted)
 */
export function mergeItems<T extends { readonly id: string }>(
  bundled: readonly T[],
  userRecords: readonly UserItemRecord<T>[],
): readonly MergedItem<T>[] {
  const recordMap = createRecordMap(userRecords);
  const bundledIds = new Set(bundled.map((b) => b.id));
  const result: MergedItem<T>[] = [];

  // Process bundled items
  for (const item of bundled) {
    const record = recordMap.get(item.id);

    // Skip if user deleted this bundled item
    if (record?.deleted) continue;

    // Use user's modified data if present, otherwise bundled
    if (record?.data !== undefined) {
      result.push({
        item: record.data,
        source: "bundled",
        isModified: true,
        isDeleted: false,
      });
    } else {
      result.push({
        item,
        source: "bundled",
        isModified: false,
        isDeleted: false,
      });
    }
  }

  // Add user-created items (not overrides of bundled)
  for (const record of userRecords) {
    if (!bundledIds.has(record.id) && record.data !== undefined && !record.deleted) {
      result.push({
        item: record.data,
        source: "user",
        isModified: false,
        isDeleted: false,
      });
    }
  }

  return result;
}

/**
 * Gets deleted bundled items for the restore UI.
 *
 * @param bundled - Items from bundled game data
 * @param userRecords - User override records
 * @returns Deleted bundled items only
 */
export function getDeletedItems<T extends { readonly id: string }>(
  bundled: readonly T[],
  userRecords: readonly UserItemRecord<T>[],
): readonly MergedItem<T>[] {
  const recordMap = createRecordMap(userRecords);
  const result: MergedItem<T>[] = [];

  for (const item of bundled) {
    const record = recordMap.get(item.id);
    if (record?.deleted) {
      result.push({
        item,
        source: "bundled",
        isModified: false,
        isDeleted: true,
      });
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Variant Types Merging
// ---------------------------------------------------------------------------

/**
 * Merges bundled variant types with user overrides.
 *
 * @param bundled - Variant types from bundled data
 * @param userOverrides - User variant type overrides
 * @returns Merged variant type entries (excluding deleted)
 */
export function mergeVariantTypes(
  bundled: VariantTypes,
  userOverrides: UserVariantTypes,
): readonly MergedItem<VariantTypeEntry & { readonly key: string }>[] {
  const deletedSet = new Set(userOverrides.deletedKeys);
  const result: MergedItem<VariantTypeEntry & { readonly key: string }>[] = [];

  // Process bundled variant types
  for (const [key, entry] of Object.entries(bundled)) {
    if (deletedSet.has(key)) continue;

    const modification = userOverrides.modifications[key];
    if (modification !== undefined) {
      result.push({
        item: { ...modification, key },
        source: "bundled",
        isModified: true,
        isDeleted: false,
      });
    } else {
      result.push({
        item: { ...entry, key },
        source: "bundled",
        isModified: false,
        isDeleted: false,
      });
    }
  }

  // Add user additions
  for (const [key, entry] of Object.entries(userOverrides.additions)) {
    result.push({
      item: { ...entry, key },
      source: "user",
      isModified: false,
      isDeleted: false,
    });
  }

  return result;
}

/**
 * Gets deleted bundled variant types for the restore UI.
 *
 * @param bundled - Variant types from bundled data
 * @param userOverrides - User variant type overrides
 * @returns Deleted bundled variant types only
 */
export function getDeletedVariantTypes(
  bundled: VariantTypes,
  userOverrides: UserVariantTypes,
): readonly MergedItem<VariantTypeEntry & { readonly key: string }>[] {
  const deletedSet = new Set(userOverrides.deletedKeys);
  const result: MergedItem<VariantTypeEntry & { readonly key: string }>[] = [];

  for (const [key, entry] of Object.entries(bundled)) {
    if (deletedSet.has(key)) {
      result.push({
        item: { ...entry, key },
        source: "bundled",
        isModified: false,
        isDeleted: true,
      });
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Utility: Convert merged variant types back to VariantTypes
// ---------------------------------------------------------------------------

/**
 * Converts merged variant type items back to a VariantTypes record.
 *
 * Useful when the search engine needs a plain VariantTypes object.
 */
export function toVariantTypesRecord(
  merged: readonly MergedItem<VariantTypeEntry & { readonly key: string }>[],
): VariantTypes {
  const result: Record<string, VariantTypeEntry> = {};
  for (const { item } of merged) {
    const { key, ...entry } = item;
    result[key] = entry;
  }
  return result;
}
