/**
 * Zod schemas for user data validation.
 *
 * Validates user overrides stored in localStorage and imported data.
 */

import { z } from "zod";
import {
  equipmentSchema,
  enchantmentSchema,
  modifierSchema,
  gemSchema,
  variantTypesSchema,
} from "./schemas";

// ---------------------------------------------------------------------------
// Variant Type Entry (for user data)
// ---------------------------------------------------------------------------

const variantTypeEntrySchema = z
  .object({
    label: z.string(),
    variants: z.array(z.string()).readonly(),
  })
  .readonly();

// ---------------------------------------------------------------------------
// User Item Record Schemas
// ---------------------------------------------------------------------------

/**
 * Creates a user item record schema for the given item schema.
 */
function createUserItemRecordSchema<T extends z.ZodTypeAny>(itemSchema: T) {
  return z
    .object({
      id: z.string(),
      deleted: z.boolean().optional(),
      data: itemSchema.optional(),
      baseVersion: z.number().int().optional(),
      createdAt: z.number(),
      updatedAt: z.number(),
    })
    .readonly();
}

export const userEquipmentRecordSchema = createUserItemRecordSchema(equipmentSchema);
export const userEnchantmentRecordSchema = createUserItemRecordSchema(enchantmentSchema);
export const userModifierRecordSchema = createUserItemRecordSchema(modifierSchema);
export const userGemRecordSchema = createUserItemRecordSchema(gemSchema);

// ---------------------------------------------------------------------------
// User Variant Types Schema
// ---------------------------------------------------------------------------

export const userVariantTypesSchema = z
  .object({
    additions: z.record(z.string(), variantTypeEntrySchema).readonly(),
    modifications: z.record(z.string(), variantTypeEntrySchema).readonly(),
    deletedKeys: z.array(z.string()).readonly(),
  })
  .readonly();

// ---------------------------------------------------------------------------
// Storage Schema
// ---------------------------------------------------------------------------

export const userDataStorageSchema = z
  .object({
    schemaVersion: z.literal(1),
    bundledVersion: z.number().int(),
    equipment: z.array(userEquipmentRecordSchema).readonly(),
    enchantments: z.array(userEnchantmentRecordSchema).readonly(),
    modifiers: z.array(userModifierRecordSchema).readonly(),
    gems: z.array(userGemRecordSchema).readonly(),
    variantTypes: userVariantTypesSchema,
  })
  .readonly();

// ---------------------------------------------------------------------------
// Export Schema
// ---------------------------------------------------------------------------

const deletedBundledIdsSchema = z
  .object({
    equipment: z.array(z.string()).readonly(),
    enchantments: z.array(z.string()).readonly(),
    modifiers: z.array(z.string()).readonly(),
    gems: z.array(z.string()).readonly(),
    variantTypes: z.array(z.string()).readonly(),
  })
  .readonly();

export const userDataExportSchema = z
  .object({
    formatVersion: z.literal(1),
    exportedAt: z.number(),
    equipment: z.array(equipmentSchema).readonly(),
    enchantments: z.array(enchantmentSchema).readonly(),
    modifiers: z.array(modifierSchema).readonly(),
    gems: z.array(gemSchema).readonly(),
    variantTypes: variantTypesSchema,
    deletedBundledIds: deletedBundledIdsSchema,
  })
  .readonly();

// ---------------------------------------------------------------------------
// Data Manifest Schema
// ---------------------------------------------------------------------------

export const dataManifestSchema = z
  .object({
    version: z.number().int().positive(),
  })
  .readonly();
