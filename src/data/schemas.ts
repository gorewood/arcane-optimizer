/**
 * Zod schemas for runtime validation of game data JSON files.
 *
 * Each schema mirrors the corresponding interface in `src/models/types.ts`.
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Shared
// ---------------------------------------------------------------------------

const statNameSchema = z.enum([
  "power",
  "defense",
  "size",
  "dexterity",
  "range",
  "haste",
  "insanity",
  "warding",
  "drawback",
  "regeneration",
  "pierce",
  "resistance",
]);

/** Partial stats — only the stats present on the item. */
const partialStatsSchema = z
  .record(statNameSchema, z.number())
  .readonly();

// ---------------------------------------------------------------------------
// Equipment
// ---------------------------------------------------------------------------

const slotTypeSchema = z.enum([
  "chestplate",
  "leggings",
  "accessory",
  "accessory-H",
  "accessory-A",
]);

export const equipmentSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    setName: z.string().optional(),
    slot: slotTypeSchema,
    baseStats: partialStatsSchema,
    socketCount: z.number().int().nonnegative(),
    maxLevel: z.number().int().positive(),
    tags: z.array(z.string()).readonly(),
  })
  .readonly();

export const equipmentArraySchema = z.array(equipmentSchema).readonly();

// ---------------------------------------------------------------------------
// Enchantments
// ---------------------------------------------------------------------------

const enchantmentTargetSchema = z.enum(["armor", "accessory"]);

export const enchantmentSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    tier: z.union([z.literal(1), z.literal(2)]),
    applicableTo: z.array(enchantmentTargetSchema).readonly(),
    stats: partialStatsSchema,
    incompatibleWith: z.array(z.string()).readonly().optional(),
  })
  .readonly();

export const enchantmentArraySchema = z
  .array(enchantmentSchema)
  .readonly();

// ---------------------------------------------------------------------------
// Modifiers
// ---------------------------------------------------------------------------

const atlanteanConfigSchema = z
  .object({
    insanity: z.number(),
    possibleBonusStats: z.array(statNameSchema).readonly(),
  })
  .readonly();

export const modifierSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    stats: partialStatsSchema,
    grantsSocket: z.boolean().optional(),
    atlanteanBehavior: atlanteanConfigSchema.optional(),
  })
  .readonly();

export const modifierArraySchema = z.array(modifierSchema).readonly();

// ---------------------------------------------------------------------------
// Gems
// ---------------------------------------------------------------------------

export const gemSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    tier: z.union([z.literal(1), z.literal(2)]),
    stats: partialStatsSchema,
  })
  .readonly();

export const gemArraySchema = z.array(gemSchema).readonly();
