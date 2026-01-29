/**
 * Sync actions for user data store.
 *
 * Handles duplicate detection, categorization, and purging during version updates.
 */

import type {
  EquipmentPiece,
  Enchantment,
  Modifier,
  Gem,
} from "@/models/types";
import type {
  UserEquipmentRecord,
  UserEnchantmentRecord,
  UserModifierRecord,
  UserGemRecord,
} from "@/data/user-data-types";
import {
  detectEquipmentDuplicates,
  detectNamedDuplicates,
  categorizeUserItems,
  type SyncSummary,
  type DuplicateMatch,
} from "@/data/sync-utils";
import type { ChangelogEntry } from "@/data/user-data-schemas";
import dataManifest from "@/data/data-manifest.json";

// Re-export types for external use
export type { SyncSummary, DuplicateMatch };

// ---------------------------------------------------------------------------
// Duplicate Detection
// ---------------------------------------------------------------------------

interface DetectAllDuplicatesParams {
  readonly userEquipment: readonly UserEquipmentRecord[];
  readonly userEnchantments: readonly UserEnchantmentRecord[];
  readonly userModifiers: readonly UserModifierRecord[];
  readonly userGems: readonly UserGemRecord[];
  readonly bundledEquipment: readonly EquipmentPiece[];
  readonly bundledEnchantments: readonly Enchantment[];
  readonly bundledModifiers: readonly Modifier[];
  readonly bundledGems: readonly Gem[];
}

interface AllDuplicates {
  readonly equipment: readonly DuplicateMatch[];
  readonly enchantments: readonly DuplicateMatch[];
  readonly modifiers: readonly DuplicateMatch[];
  readonly gems: readonly DuplicateMatch[];
}

/** Detects duplicates across all item types. */
export function detectAllDuplicates(params: DetectAllDuplicatesParams): AllDuplicates {
  return {
    equipment: detectEquipmentDuplicates(params.userEquipment, params.bundledEquipment),
    enchantments: detectNamedDuplicates(params.userEnchantments, params.bundledEnchantments),
    modifiers: detectNamedDuplicates(params.userModifiers, params.bundledModifiers),
    gems: detectNamedDuplicates(params.userGems, params.bundledGems),
  };
}

// ---------------------------------------------------------------------------
// Sync Summary
// ---------------------------------------------------------------------------

interface BuildSyncSummaryParams {
  readonly duplicates: AllDuplicates;
  readonly userEquipment: readonly UserEquipmentRecord[];
  readonly userEnchantments: readonly UserEnchantmentRecord[];
  readonly userModifiers: readonly UserModifierRecord[];
  readonly userGems: readonly UserGemRecord[];
}

/** Aggregates categorization counts from multiple item types. */
function aggregateCounts(
  duplicates: AllDuplicates,
  params: BuildSyncSummaryParams
): { duplicates: number; orphans: number; custom: number } {
  const dupIdSets = {
    equipment: new Set(duplicates.equipment.map((d) => d.userItemId)),
    enchantments: new Set(duplicates.enchantments.map((d) => d.userItemId)),
    modifiers: new Set(duplicates.modifiers.map((d) => d.userItemId)),
    gems: new Set(duplicates.gems.map((d) => d.userItemId)),
  };

  const cats = [
    categorizeUserItems(params.userEquipment, dupIdSets.equipment),
    categorizeUserItems(params.userEnchantments, dupIdSets.enchantments),
    categorizeUserItems(params.userModifiers, dupIdSets.modifiers),
    categorizeUserItems(params.userGems, dupIdSets.gems),
  ];

  return {
    duplicates: cats.reduce((sum, c) => sum + c.duplicates.length, 0),
    orphans: cats.reduce((sum, c) => sum + c.orphanContributions.length, 0),
    custom: cats.reduce((sum, c) => sum + c.customItems.length, 0),
  };
}

/** Builds sync summary from detected duplicates. */
export function buildUserDataSyncSummary(params: BuildSyncSummaryParams): SyncSummary {
  const counts = aggregateCounts(params.duplicates, params);
  const changelogEntry = getChangelogEntryForCurrentVersion();

  return {
    bundledChanges: {
      added: changelogEntry?.added?.length ?? 0,
      modified: changelogEntry?.modified?.length ?? 0,
      removed: changelogEntry?.removed?.length ?? 0,
    },
    userItems: {
      duplicates: counts.duplicates,
      orphanContributions: counts.orphans,
      customItems: counts.custom,
    },
    changelog: changelogEntry,
  };
}

// ---------------------------------------------------------------------------
// Changelog
// ---------------------------------------------------------------------------

/** Gets the changelog entry for the current bundled version. */
export function getChangelogEntryForCurrentVersion(): ChangelogEntry | undefined {
  const changelog = dataManifest.changelog as ChangelogEntry[] | undefined;
  return changelog?.find((entry) => entry.version === dataManifest.version);
}

// ---------------------------------------------------------------------------
// Purge Logic
// ---------------------------------------------------------------------------

interface PurgeResult {
  readonly userEquipment: readonly UserEquipmentRecord[];
  readonly userEnchantments: readonly UserEnchantmentRecord[];
  readonly userModifiers: readonly UserModifierRecord[];
  readonly userGems: readonly UserGemRecord[];
}

interface PurgeParams {
  readonly duplicates: AllDuplicates;
  readonly userEquipment: readonly UserEquipmentRecord[];
  readonly userEnchantments: readonly UserEnchantmentRecord[];
  readonly userModifiers: readonly UserModifierRecord[];
  readonly userGems: readonly UserGemRecord[];
}

/** Purges duplicate contribution items from user data. */
export function purgeDuplicates(params: PurgeParams): PurgeResult {
  const { duplicates, userEquipment, userEnchantments, userModifiers, userGems } = params;
  const equipIds = new Set(duplicates.equipment.map((d) => d.userItemId));
  const enchIds = new Set(duplicates.enchantments.map((d) => d.userItemId));
  const modIds = new Set(duplicates.modifiers.map((d) => d.userItemId));
  const gemIds = new Set(duplicates.gems.map((d) => d.userItemId));

  return {
    userEquipment: userEquipment.filter((r) => !equipIds.has(r.id)),
    userEnchantments: userEnchantments.filter((r) => !enchIds.has(r.id)),
    userModifiers: userModifiers.filter((r) => !modIds.has(r.id)),
    userGems: userGems.filter((r) => !gemIds.has(r.id)),
  };
}
