/**
 * Helper functions for user data store.
 *
 * Pure functions extracted for testability and to keep store file small.
 */

import type {
  EquipmentPiece,
  Enchantment,
  Modifier,
  Gem,
  VariantTypeEntry,
} from "@/models/types";
import type {
  UserEquipmentRecord,
  UserEnchantmentRecord,
  UserModifierRecord,
  UserGemRecord,
  UserDataExport,
  UserItemRecord,
} from "@/data/user-data-types";
import dataManifest from "@/data/data-manifest.json";

// ---------------------------------------------------------------------------
// ID Generation
// ---------------------------------------------------------------------------

export function generateId(type: string): string {
  const timestamp = String(Date.now());
  const random = Math.random().toString(36).slice(2, 9);
  return `user-${type}-${timestamp}-${random}`;
}

// ---------------------------------------------------------------------------
// Record Operations - Equipment
// ---------------------------------------------------------------------------

export function addEquipmentRecord(
  records: readonly UserEquipmentRecord[],
  item: EquipmentPiece,
): { readonly records: readonly UserEquipmentRecord[]; readonly id: string } {
  const now = Date.now();
  const id = generateId("equipment");
  const itemWithId: EquipmentPiece = { ...item, id };
  const record: UserEquipmentRecord = { id, data: itemWithId, createdAt: now, updatedAt: now };
  return { records: [...records, record], id };
}

export function updateEquipmentRecord(
  records: readonly UserEquipmentRecord[],
  bundled: readonly EquipmentPiece[],
  id: string,
  item: EquipmentPiece,
): readonly UserEquipmentRecord[] {
  const now = Date.now();
  const existing = records.find((r) => r.id === id);

  if (existing) {
    return records.map((r): UserEquipmentRecord => (r.id === id ? { ...r, data: item, updatedAt: now } : r));
  }

  const bundledItem = bundled.find((b) => b.id === id);
  if (bundledItem) {
    const newRecord: UserEquipmentRecord = {
      id, data: item, baseVersion: dataManifest.version, createdAt: now, updatedAt: now,
    };
    return [...records, newRecord];
  }

  return records;
}

export function deleteEquipmentRecord(
  records: readonly UserEquipmentRecord[],
  bundled: readonly EquipmentPiece[],
  id: string,
): readonly UserEquipmentRecord[] {
  const now = Date.now();
  const isBundled = bundled.some((b) => b.id === id);

  if (isBundled) {
    const existing = records.find((r) => r.id === id);
    if (existing) {
      return records.map((r): UserEquipmentRecord => (r.id === id ? { ...r, deleted: true, updatedAt: now } : r));
    }
    const marker: UserEquipmentRecord = { id, deleted: true, createdAt: now, updatedAt: now };
    return [...records, marker];
  }

  return records.filter((r) => r.id !== id);
}

export function restoreEquipmentRecord(
  records: readonly UserEquipmentRecord[],
  id: string,
): readonly UserEquipmentRecord[] {
  return records.filter((r) => r.id !== id || !r.deleted);
}

// ---------------------------------------------------------------------------
// Record Operations - Enchantment
// ---------------------------------------------------------------------------

export function addEnchantmentRecord(
  records: readonly UserEnchantmentRecord[],
  item: Enchantment,
): { readonly records: readonly UserEnchantmentRecord[]; readonly id: string } {
  const now = Date.now();
  const id = generateId("enchantment");
  const itemWithId: Enchantment = { ...item, id };
  const record: UserEnchantmentRecord = { id, data: itemWithId, createdAt: now, updatedAt: now };
  return { records: [...records, record], id };
}

export function updateEnchantmentRecord(
  records: readonly UserEnchantmentRecord[],
  bundled: readonly Enchantment[],
  id: string,
  item: Enchantment,
): readonly UserEnchantmentRecord[] {
  const now = Date.now();
  const existing = records.find((r) => r.id === id);

  if (existing) {
    return records.map((r): UserEnchantmentRecord => (r.id === id ? { ...r, data: item, updatedAt: now } : r));
  }

  const bundledItem = bundled.find((b) => b.id === id);
  if (bundledItem) {
    const newRecord: UserEnchantmentRecord = {
      id, data: item, baseVersion: dataManifest.version, createdAt: now, updatedAt: now,
    };
    return [...records, newRecord];
  }

  return records;
}

export function deleteEnchantmentRecord(
  records: readonly UserEnchantmentRecord[],
  bundled: readonly Enchantment[],
  id: string,
): readonly UserEnchantmentRecord[] {
  const now = Date.now();
  const isBundled = bundled.some((b) => b.id === id);

  if (isBundled) {
    const existing = records.find((r) => r.id === id);
    if (existing) {
      return records.map((r): UserEnchantmentRecord => (r.id === id ? { ...r, deleted: true, updatedAt: now } : r));
    }
    const marker: UserEnchantmentRecord = { id, deleted: true, createdAt: now, updatedAt: now };
    return [...records, marker];
  }

  return records.filter((r) => r.id !== id);
}

export function restoreEnchantmentRecord(
  records: readonly UserEnchantmentRecord[],
  id: string,
): readonly UserEnchantmentRecord[] {
  return records.filter((r) => r.id !== id || !r.deleted);
}

// ---------------------------------------------------------------------------
// Record Operations - Modifier
// ---------------------------------------------------------------------------

export function addModifierRecord(
  records: readonly UserModifierRecord[],
  item: Modifier,
): { readonly records: readonly UserModifierRecord[]; readonly id: string } {
  const now = Date.now();
  const id = generateId("modifier");
  const itemWithId: Modifier = { ...item, id };
  const record: UserModifierRecord = { id, data: itemWithId, createdAt: now, updatedAt: now };
  return { records: [...records, record], id };
}

export function updateModifierRecord(
  records: readonly UserModifierRecord[],
  bundled: readonly Modifier[],
  id: string,
  item: Modifier,
): readonly UserModifierRecord[] {
  const now = Date.now();
  const existing = records.find((r) => r.id === id);

  if (existing) {
    return records.map((r): UserModifierRecord => (r.id === id ? { ...r, data: item, updatedAt: now } : r));
  }

  const bundledItem = bundled.find((b) => b.id === id);
  if (bundledItem) {
    const newRecord: UserModifierRecord = {
      id, data: item, baseVersion: dataManifest.version, createdAt: now, updatedAt: now,
    };
    return [...records, newRecord];
  }

  return records;
}

export function deleteModifierRecord(
  records: readonly UserModifierRecord[],
  bundled: readonly Modifier[],
  id: string,
): readonly UserModifierRecord[] {
  const now = Date.now();
  const isBundled = bundled.some((b) => b.id === id);

  if (isBundled) {
    const existing = records.find((r) => r.id === id);
    if (existing) {
      return records.map((r): UserModifierRecord => (r.id === id ? { ...r, deleted: true, updatedAt: now } : r));
    }
    const marker: UserModifierRecord = { id, deleted: true, createdAt: now, updatedAt: now };
    return [...records, marker];
  }

  return records.filter((r) => r.id !== id);
}

export function restoreModifierRecord(
  records: readonly UserModifierRecord[],
  id: string,
): readonly UserModifierRecord[] {
  return records.filter((r) => r.id !== id || !r.deleted);
}

// ---------------------------------------------------------------------------
// Record Operations - Gem
// ---------------------------------------------------------------------------

export function addGemRecord(
  records: readonly UserGemRecord[],
  item: Gem,
): { readonly records: readonly UserGemRecord[]; readonly id: string } {
  const now = Date.now();
  const id = generateId("gem");
  const itemWithId: Gem = { ...item, id };
  const record: UserGemRecord = { id, data: itemWithId, createdAt: now, updatedAt: now };
  return { records: [...records, record], id };
}

export function updateGemRecord(
  records: readonly UserGemRecord[],
  bundled: readonly Gem[],
  id: string,
  item: Gem,
): readonly UserGemRecord[] {
  const now = Date.now();
  const existing = records.find((r) => r.id === id);

  if (existing) {
    return records.map((r): UserGemRecord => (r.id === id ? { ...r, data: item, updatedAt: now } : r));
  }

  const bundledItem = bundled.find((b) => b.id === id);
  if (bundledItem) {
    const newRecord: UserGemRecord = {
      id, data: item, baseVersion: dataManifest.version, createdAt: now, updatedAt: now,
    };
    return [...records, newRecord];
  }

  return records;
}

export function deleteGemRecord(
  records: readonly UserGemRecord[],
  bundled: readonly Gem[],
  id: string,
): readonly UserGemRecord[] {
  const now = Date.now();
  const isBundled = bundled.some((b) => b.id === id);

  if (isBundled) {
    const existing = records.find((r) => r.id === id);
    if (existing) {
      return records.map((r): UserGemRecord => (r.id === id ? { ...r, deleted: true, updatedAt: now } : r));
    }
    const marker: UserGemRecord = { id, deleted: true, createdAt: now, updatedAt: now };
    return [...records, marker];
  }

  return records.filter((r) => r.id !== id);
}

export function restoreGemRecord(
  records: readonly UserGemRecord[],
  id: string,
): readonly UserGemRecord[] {
  return records.filter((r) => r.id !== id || !r.deleted);
}

// ---------------------------------------------------------------------------
// Export Builder
// ---------------------------------------------------------------------------

export interface ExportBuilderInput {
  readonly userEquipment: readonly UserEquipmentRecord[];
  readonly userEnchantments: readonly UserEnchantmentRecord[];
  readonly userModifiers: readonly UserModifierRecord[];
  readonly userGems: readonly UserGemRecord[];
  readonly userVariantTypesAdditions: Readonly<Record<string, VariantTypeEntry>>;
  readonly userVariantTypesModifications: Readonly<Record<string, VariantTypeEntry>>;
  readonly userVariantTypesDeletedKeys: readonly string[];
}

function filterDataRecords<T>(
  records: readonly UserItemRecord<T>[],
): readonly T[] {
  return records
    .filter((r): r is UserItemRecord<T> & { readonly data: T } => r.data !== undefined && !r.deleted)
    .map((r) => r.data);
}

function filterDeletedIds<T>(
  records: readonly UserItemRecord<T>[],
): readonly string[] {
  return records.filter((r) => r.deleted).map((r) => r.id);
}

export function buildExportData(input: ExportBuilderInput): UserDataExport {
  return {
    formatVersion: 1,
    exportedAt: Date.now(),
    equipment: filterDataRecords(input.userEquipment),
    enchantments: filterDataRecords(input.userEnchantments),
    modifiers: filterDataRecords(input.userModifiers),
    gems: filterDataRecords(input.userGems),
    variantTypes: { ...input.userVariantTypesAdditions, ...input.userVariantTypesModifications },
    deletedBundledIds: {
      equipment: filterDeletedIds(input.userEquipment),
      enchantments: filterDeletedIds(input.userEnchantments),
      modifiers: filterDeletedIds(input.userModifiers),
      gems: filterDeletedIds(input.userGems),
      variantTypes: input.userVariantTypesDeletedKeys,
    },
  };
}

// ---------------------------------------------------------------------------
// Import Parser
// ---------------------------------------------------------------------------

export interface ParsedImportResult {
  readonly success: true;
  readonly equipment: readonly UserEquipmentRecord[];
  readonly enchantments: readonly UserEnchantmentRecord[];
  readonly modifiers: readonly UserModifierRecord[];
  readonly gems: readonly UserGemRecord[];
  readonly variantAdditions: Readonly<Record<string, VariantTypeEntry>>;
  readonly variantModifications: Readonly<Record<string, VariantTypeEntry>>;
  readonly variantDeletedKeys: readonly string[];
  readonly imported: number;
}

export interface ParsedImportError {
  readonly success: false;
  readonly errors: readonly string[];
}

export type ParsedImport = ParsedImportResult | ParsedImportError;

function convertEquipmentToRecords(
  items: readonly EquipmentPiece[],
  now: number,
): UserEquipmentRecord[] {
  return items.map((item): UserEquipmentRecord => ({ id: item.id, data: item, createdAt: now, updatedAt: now }));
}

function convertEnchantmentToRecords(
  items: readonly Enchantment[],
  now: number,
): UserEnchantmentRecord[] {
  return items.map((item): UserEnchantmentRecord => ({ id: item.id, data: item, createdAt: now, updatedAt: now }));
}

function convertModifierToRecords(
  items: readonly Modifier[],
  now: number,
): UserModifierRecord[] {
  return items.map((item): UserModifierRecord => ({ id: item.id, data: item, createdAt: now, updatedAt: now }));
}

function convertGemToRecords(
  items: readonly Gem[],
  now: number,
): UserGemRecord[] {
  return items.map((item): UserGemRecord => ({ id: item.id, data: item, createdAt: now, updatedAt: now }));
}

function addEquipmentDeleteMarkers(
  ids: readonly string[],
  now: number,
): UserEquipmentRecord[] {
  return ids.map((id): UserEquipmentRecord => ({ id, deleted: true, createdAt: now, updatedAt: now }));
}

function addEnchantmentDeleteMarkers(
  ids: readonly string[],
  now: number,
): UserEnchantmentRecord[] {
  return ids.map((id): UserEnchantmentRecord => ({ id, deleted: true, createdAt: now, updatedAt: now }));
}

function addModifierDeleteMarkers(
  ids: readonly string[],
  now: number,
): UserModifierRecord[] {
  return ids.map((id): UserModifierRecord => ({ id, deleted: true, createdAt: now, updatedAt: now }));
}

function addGemDeleteMarkers(
  ids: readonly string[],
  now: number,
): UserGemRecord[] {
  return ids.map((id): UserGemRecord => ({ id, deleted: true, createdAt: now, updatedAt: now }));
}

export function parseImportData(
  data: UserDataExport,
  bundledVariantKeys: ReadonlySet<string>,
): ParsedImportResult {
  const now = Date.now();

  const equipment: UserEquipmentRecord[] = [
    ...convertEquipmentToRecords(data.equipment, now),
    ...addEquipmentDeleteMarkers(data.deletedBundledIds.equipment, now),
  ];
  const enchantments: UserEnchantmentRecord[] = [
    ...convertEnchantmentToRecords(data.enchantments, now),
    ...addEnchantmentDeleteMarkers(data.deletedBundledIds.enchantments, now),
  ];
  const modifiers: UserModifierRecord[] = [
    ...convertModifierToRecords(data.modifiers, now),
    ...addModifierDeleteMarkers(data.deletedBundledIds.modifiers, now),
  ];
  const gems: UserGemRecord[] = [
    ...convertGemToRecords(data.gems, now),
    ...addGemDeleteMarkers(data.deletedBundledIds.gems, now),
  ];

  const variantAdditions: Record<string, VariantTypeEntry> = {};
  const variantModifications: Record<string, VariantTypeEntry> = {};
  for (const [key, entry] of Object.entries(data.variantTypes)) {
    if (bundledVariantKeys.has(key)) {
      variantModifications[key] = entry;
    } else {
      variantAdditions[key] = entry;
    }
  }

  const imported = equipment.length + enchantments.length + modifiers.length + gems.length +
                   Object.keys(data.variantTypes).length + data.deletedBundledIds.variantTypes.length;

  return {
    success: true,
    equipment,
    enchantments,
    modifiers,
    gems,
    variantAdditions,
    variantModifications,
    variantDeletedKeys: [...data.deletedBundledIds.variantTypes],
    imported,
  };
}
