/**
 * Chromosome repair — ensures chromosomes encode valid loadouts
 * by fixing out-of-range indices, accessory duplicates, set-modifier
 * constraints, and insanity limits.
 */

import type { IndexedPool, Chromosome } from "./genetic-chromosome";

// ---------------------------------------------------------------------------
// Numeric helpers
// ---------------------------------------------------------------------------

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function randInt(max: number): number {
  return Math.floor(Math.random() * max);
}

// ---------------------------------------------------------------------------
// Piece lookup
// ---------------------------------------------------------------------------

import type { EquipmentPiece } from "@/models/types";

export function getPieceForSlot(
  chromo: Chromosome,
  slotIdx: number,
  pool: IndexedPool,
): EquipmentPiece | undefined {
  if (slotIdx === 0) return pool.chestplates[chromo.chestIdx];
  if (slotIdx === 1) return pool.leggings[chromo.legsIdx];
  return pool.accessories[chromo.accIndices[slotIdx - 2] ?? 0];
}

// ---------------------------------------------------------------------------
// Repair pipeline
// ---------------------------------------------------------------------------

/**
 * Repair a chromosome in-place so it encodes a structurally valid loadout.
 *
 * When `maxUnwardedInsanity` is provided, also repairs insanity violations
 * by clearing excess Atlantean modifiers from random slots.
 */
export function repair(
  chromo: Chromosome,
  pool: IndexedPool,
  maxUnwardedInsanity?: number,
): void {
  chromo.chestIdx = clamp(chromo.chestIdx, 0, pool.chestplates.length - 1);
  chromo.legsIdx = clamp(chromo.legsIdx, 0, pool.leggings.length - 1);
  repairAccessories(chromo, pool);
  for (let i = 0; i < 5; i++) {
    repairSlotIndices(chromo, i, pool);
  }
  if (maxUnwardedInsanity != null) {
    repairInsanity(chromo, pool, maxUnwardedInsanity);
  }
}

// ---------------------------------------------------------------------------
// Accessory dedup
// ---------------------------------------------------------------------------

function repairAccessories(chromo: Chromosome, pool: IndexedPool): void {
  for (let i = 0; i < 3; i++) {
    chromo.accIndices[i] = clamp(chromo.accIndices[i] ?? 0, 0, pool.accessories.length - 1);
  }
  const accSet = new Set<number>();
  for (let i = 0; i < 3; i++) {
    let idx = chromo.accIndices[i] ?? 0;
    while (accSet.has(idx)) { idx = (idx + 1) % pool.accessories.length; }
    chromo.accIndices[i] = idx;
    accSet.add(idx);
  }
}

// ---------------------------------------------------------------------------
// Set-modifier enforcement
// ---------------------------------------------------------------------------

function repairSetModifier(chromo: Chromosome, i: number, pool: IndexedPool): void {
  const piece = getPieceForSlot(chromo, i, pool);
  if (piece?.atlanteanOnly === false) return;
  const modIdx = chromo.modIndices[i] ?? -1;
  if (modIdx < 0) return;
  const mod = pool.modifiers[modIdx];
  if (mod != null && mod.atlanteanBehavior == null) {
    chromo.modIndices[i] = pool.setModifierIndices[0] ?? -1;
  }
}

// ---------------------------------------------------------------------------
// Slot index clamping
// ---------------------------------------------------------------------------

function getEnchantPool(slotIdx: number, pool: IndexedPool) {
  return slotIdx < 2 ? pool.armorEnchantments : pool.accessoryEnchantments;
}

function repairSlotIndices(chromo: Chromosome, i: number, pool: IndexedPool): void {
  const enchPool = getEnchantPool(i, pool);
  chromo.enchantIndices[i] = clamp(chromo.enchantIndices[i] ?? -1, -1, enchPool.length - 1);
  chromo.modIndices[i] = clamp(chromo.modIndices[i] ?? -1, -1, pool.modifiers.length - 1);
  repairSetModifier(chromo, i, pool);
  const slotGems = chromo.gemIndices[i];
  if (slotGems != null) {
    for (let s = 0; s < slotGems.length; s++) {
      slotGems[s] = clamp(slotGems[s] ?? -1, -1, pool.gems.length - 1);
    }
  }
}

// ---------------------------------------------------------------------------
// Insanity repair
// ---------------------------------------------------------------------------

/**
 * Count Atlantean modifiers in the chromosome and clear excess ones
 * when total insanity would exceed the allowed limit.
 *
 * Each Atlantean modifier contributes its `atlanteanBehavior.insanity`
 * to total insanity. Warding from gems/enchantments is not considered
 * here (too expensive to decode); instead we conservatively allow up to
 * `maxUnwarded` total insanity points worth of Atlantean modifiers.
 */
function repairInsanity(
  chromo: Chromosome,
  pool: IndexedPool,
  maxUnwarded: number,
): void {
  const atlanteanSlots = gatherAtlanteanSlots(chromo, pool);
  let totalInsanity = atlanteanSlots.reduce(
    (sum, s) => sum + s.insanity, 0,
  );

  if (totalInsanity <= maxUnwarded) return;

  shuffleInPlace(atlanteanSlots);

  for (const entry of atlanteanSlots) {
    if (totalInsanity <= maxUnwarded) break;
    chromo.modIndices[entry.slot] = -1;
    totalInsanity -= entry.insanity;
  }
}

interface AtlanteanSlotEntry {
  readonly slot: number;
  readonly insanity: number;
}

function gatherAtlanteanSlots(
  chromo: Chromosome,
  pool: IndexedPool,
): AtlanteanSlotEntry[] {
  const entries: AtlanteanSlotEntry[] = [];
  for (let i = 0; i < 5; i++) {
    const modIdx = chromo.modIndices[i] ?? -1;
    if (modIdx < 0) continue;
    const mod = pool.modifiers[modIdx];
    if (mod?.atlanteanBehavior != null) {
      entries.push({ slot: i, insanity: mod.atlanteanBehavior.insanity });
    }
  }
  return entries;
}

function shuffleInPlace(arr: unknown[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randInt(i + 1);
    const tmp = arr[i];
    const swp = arr[j];
    if (tmp != null && swp != null) {
      arr[i] = swp;
      arr[j] = tmp;
    }
  }
}
