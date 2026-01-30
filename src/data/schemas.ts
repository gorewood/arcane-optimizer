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
    tags: z.array(z.string()).readonly().optional().default([]),
    atlanteanOnly: z.boolean().optional(),
    variants: z.record(z.string(), partialStatsSchema).readonly().optional(),
    /** Source of the item: boss name, NPC, location, or acquisition method. */
    source: z.string().optional(),
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

// ---------------------------------------------------------------------------
// Variant Types
// ---------------------------------------------------------------------------

const variantTypeEntrySchema = z
  .object({
    label: z.string(),
    variants: z.array(z.string()).readonly(),
  })
  .readonly();

export const variantTypesSchema = z
  .record(z.string(), variantTypeEntrySchema)
  .readonly();

// ---------------------------------------------------------------------------
// Soft Constraints (for profiles)
// ---------------------------------------------------------------------------

const constraintTypeSchema = z.enum([
  "minimize",
  "maximize",
  "atLeast",
  "atMost",
  "between",
  "exactly",
]);

export const softConstraintSchema = z
  .object({
    stat: statNameSchema,
    type: constraintTypeSchema,
    value: z.number().optional(),
    weight: z.number(),
    /** For 'between' constraints: the maximum value. */
    hardCap: z.number().optional(),
  })
  .readonly();

// ---------------------------------------------------------------------------
// Profiles
// ---------------------------------------------------------------------------

/** Scoring mode for fitness evaluation. */
const scoringModeSchema = z.enum(["linear", "efficiency", "multiplier"]);

/** Stat limits schema (insanity, warding, drawback). */
const statLimitsSchema = z
  .object({
    insanity: z.number(),
    warding: z.number(),
    drawback: z.number(),
  })
  .readonly();

/** Stat minimums schema (partial record, missing = disabled). */
const statMinimumsSchema = z.record(statNameSchema, z.number()).readonly();

/** Stat weights schema (all 12 stats required). */
const statWeightsSchema = z
  .object({
    power: z.number(),
    defense: z.number(),
    size: z.number(),
    dexterity: z.number(),
    range: z.number(),
    haste: z.number(),
    insanity: z.number(),
    warding: z.number(),
    drawback: z.number(),
    regeneration: z.number(),
    pierce: z.number(),
    resistance: z.number(),
  })
  .readonly();

/** Constraints mode config schema. */
const constraintsModeConfigSchema = z
  .object({
    constraints: z.array(softConstraintSchema).readonly(),
  })
  .readonly();

/** Weights mode config schema (for Efficiency/Multiplier). */
const weightsModeConfigSchema = z
  .object({
    limits: statLimitsSchema,
    minimums: statMinimumsSchema,
    weights: statWeightsSchema,
  })
  .readonly();

/** A default profile shipped with the app. */
export const defaultProfileSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    version: z.number().int().positive(),
    scoringMode: scoringModeSchema,
    enabledVariants: z.array(z.string()).readonly(),
    constraintsConfig: constraintsModeConfigSchema,
    efficiencyConfig: weightsModeConfigSchema,
    multiplierConfig: weightsModeConfigSchema,
  })
  .readonly();

/** The default profiles config file format. */
export const defaultProfilesConfigSchema = z
  .object({
    version: z.number().int().positive(),
    profiles: z.array(defaultProfileSchema).readonly(),
  })
  .readonly();

/** A user profile stored in localStorage. */
export const userProfileSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    scoringMode: scoringModeSchema,
    enabledVariants: z.array(z.string()).readonly(),
    constraintsConfig: constraintsModeConfigSchema,
    efficiencyConfig: weightsModeConfigSchema,
    multiplierConfig: weightsModeConfigSchema,
    baseVersion: z.number().int().optional(), // Version of default it was based on
    deleted: z.boolean().optional(), // True if user deleted a default profile
    createdAt: z.number(),
    updatedAt: z.number(),
  })
  .readonly();

/** User profiles storage format. */
export const userProfilesStorageSchema = z
  .object({
    profiles: z.array(userProfileSchema).readonly(),
  })
  .readonly();
