/**
 * GA chromosome representation, decoding, random generation,
 * crossover, and mutation.
 */

import type {
  Enchantment,
  EquipmentPiece,
  EquippedSlot,
  GearPool,
  Gem,
  HardConstraints,
  Loadout,
  Modifier,
  SoftConstraint,
  StatName,
  Stats,
} from "@/models/types";

import { validateLoadout } from "./constraints";
import { computeFitness } from "./fitness";
import { getPieceForSlot } from "./genetic-repair";
import { computeLoadoutStats, getAtlanteanBonusStat } from "./stats";

// ---------------------------------------------------------------------------
// Chromosome
// ---------------------------------------------------------------------------

export interface Chromosome {
  chestIdx: number;
  legsIdx: number;
  accIndices: [number, number, number];
  enchantIndices: [number, number, number, number, number];
  modIndices: [number, number, number, number, number];
  gemIndices: number[][];
}

export interface EvaluatedIndividual {
  chromosome: Chromosome;
  score: number;
  loadout: Loadout;
  stats: Stats;
  atlanteanMap: ReadonlyMap<number, StatName>;
}

// ---------------------------------------------------------------------------
// Pool indexing
// ---------------------------------------------------------------------------

export interface IndexedPool {
  readonly chestplates: readonly EquipmentPiece[];
  readonly leggings: readonly EquipmentPiece[];
  readonly accessories: readonly EquipmentPiece[];
  readonly armorEnchantments: readonly Enchantment[];
  readonly accessoryEnchantments: readonly Enchantment[];
  readonly modifiers: readonly Modifier[];
  /** Indices into `modifiers` valid for armor-set pieces (Atlantean only). */
  readonly setModifierIndices: readonly number[];
  readonly gems: readonly Gem[];
}

export function buildIndexedPool(pool: GearPool): IndexedPool {
  return {
    chestplates: pool.chestplates,
    leggings: pool.leggings,
    accessories: pool.accessories,
    armorEnchantments: pool.enchantments.filter((e) => e.applicableTo.includes("armor")),
    accessoryEnchantments: pool.enchantments.filter((e) => e.applicableTo.includes("accessory")),
    modifiers: pool.modifiers,
    setModifierIndices: pool.modifiers
      .map((m, i) => (m.atlanteanBehavior != null ? i : -1))
      .filter((i) => i >= 0),
    gems: pool.gems,
  };
}

function getEnchantPool(slotIdx: number, pool: IndexedPool): readonly Enchantment[] {
  return slotIdx < 2 ? pool.armorEnchantments : pool.accessoryEnchantments;
}

// ---------------------------------------------------------------------------
// Random helpers
// ---------------------------------------------------------------------------

function randInt(max: number): number {
  return Math.floor(Math.random() * max);
}

// ---------------------------------------------------------------------------
// Set-piece modifier constraint helpers
// ---------------------------------------------------------------------------

function pickRandomModIdx(
  piece: EquipmentPiece | undefined,
  pool: IndexedPool,
): number {
  if (piece?.atlanteanOnly !== false) {
    const valid = pool.setModifierIndices;
    if (valid.length === 0) return -1;
    const r = randInt(valid.length + 1) - 1;
    return r < 0 ? -1 : valid[r] ?? -1;
  }
  return randInt(pool.modifiers.length + 1) - 1;
}

// ---------------------------------------------------------------------------
// Decode chromosome to loadout
// ---------------------------------------------------------------------------

interface ResolveSlotParams {
  readonly piece: EquipmentPiece;
  readonly slotIdx: number;
  readonly chromo: Chromosome;
  readonly pool: IndexedPool;
}

function resolveSlot(
  params: ResolveSlotParams,
  atlanteanMap: Map<number, StatName>,
): EquippedSlot {
  const { piece, slotIdx, chromo, pool } = params;
  const enchPool = getEnchantPool(slotIdx, pool);
  const eIdx = chromo.enchantIndices[slotIdx] ?? -1;
  const mIdx = chromo.modIndices[slotIdx] ?? -1;
  const enchantment = eIdx >= 0 ? enchPool[eIdx] : undefined;
  const rawModifier = mIdx >= 0 ? pool.modifiers[mIdx] : undefined;
  // Atlantean-only pieces cannot have regular modifiers
  const modifier = (piece.atlanteanOnly !== false && rawModifier?.atlanteanBehavior == null)
    ? undefined
    : rawModifier;

  const gems = resolveGems(piece, modifier, chromo.gemIndices[slotIdx] ?? [], pool);
  const slot: EquippedSlot = { piece, enchantment, modifier, gems };

  resolveAtlanteanSlot(slot, slotIdx, atlanteanMap);
  return slot;
}

function resolveGems(
  piece: EquipmentPiece,
  modifier: Modifier | undefined,
  slotGemIndices: readonly number[],
  pool: IndexedPool,
): Gem[] {
  const socketCount = piece.socketCount + (modifier?.grantsSocket === true ? 1 : 0);
  const gems: Gem[] = [];
  for (let s = 0; s < Math.min(slotGemIndices.length, socketCount); s++) {
    const gIdx = slotGemIndices[s] ?? -1;
    if (gIdx >= 0) {
      const gem = pool.gems[gIdx];
      if (gem != null) gems.push(gem);
    }
  }
  return gems;
}

function resolveAtlanteanSlot(
  slot: EquippedSlot,
  slotIdx: number,
  atlanteanMap: Map<number, StatName>,
): void {
  const chosen = getAtlanteanBonusStat(slot);
  if (chosen != null) atlanteanMap.set(slotIdx, chosen);
}

function resolvePieces(
  chromo: Chromosome,
  pool: IndexedPool,
): readonly EquipmentPiece[] | null {
  const chest = pool.chestplates[chromo.chestIdx];
  const legs = pool.leggings[chromo.legsIdx];
  if (chest == null || legs == null) return null;

  const acc0 = pool.accessories[chromo.accIndices[0]];
  const acc1 = pool.accessories[chromo.accIndices[1]];
  const acc2 = pool.accessories[chromo.accIndices[2]];
  if (acc0 == null || acc1 == null || acc2 == null) return null;

  return [chest, legs, acc0, acc1, acc2];
}

export function decodeChromosome(
  chromo: Chromosome,
  pool: IndexedPool,
): { loadout: Loadout; atlanteanMap: ReadonlyMap<number, StatName> } | null {
  const pieces = resolvePieces(chromo, pool);
  if (pieces == null) return null;

  const atlanteanMap = new Map<number, StatName>();
  const slots: EquippedSlot[] = [];

  for (let i = 0; i < 5; i++) {
    const piece = pieces[i];
    if (piece == null) return null;
    slots.push(resolveSlot({ piece, slotIdx: i, chromo, pool }, atlanteanMap));
  }

  const s0 = slots[0];
  const s1 = slots[1];
  const s2 = slots[2];
  const s3 = slots[3];
  const s4 = slots[4];
  if (s0 == null || s1 == null || s2 == null || s3 == null || s4 == null) return null;

  return { loadout: { slots: [s0, s1, s2, s3, s4] }, atlanteanMap };
}

// ---------------------------------------------------------------------------
// Evaluate
// ---------------------------------------------------------------------------

export function evaluate(
  chromo: Chromosome,
  pool: IndexedPool,
  constraints: HardConstraints,
  fitness: readonly SoftConstraint[],
): EvaluatedIndividual | null {
  const decoded = decodeChromosome(chromo, pool);
  if (decoded == null) return null;

  const validation = validateLoadout(decoded.loadout, constraints);
  if (!validation.valid) return null;

  const stats = computeLoadoutStats(decoded.loadout, decoded.atlanteanMap);
  const score = computeFitness(stats, fitness);
  if (score === -Infinity) return null;

  return {
    chromosome: chromo,
    score,
    loadout: decoded.loadout,
    stats,
    atlanteanMap: decoded.atlanteanMap,
  };
}

// ---------------------------------------------------------------------------
// Random chromosome
// ---------------------------------------------------------------------------

function pickDistinct(count: number, max: number): number[] {
  if (max < count) return Array.from({ length: count }, (_, i) => i % max);
  const result: number[] = [];
  const used = new Set<number>();
  while (result.length < count) {
    const v = randInt(max);
    if (!used.has(v)) { used.add(v); result.push(v); }
  }
  return result;
}

function randomSlotGenes(
  piece: EquipmentPiece | undefined,
  slotIdx: number,
  pool: IndexedPool,
): { enchIdx: number; modIdx: number; gems: number[] } {
  const enchPool = getEnchantPool(slotIdx, pool);
  const enchIdx = randInt(enchPool.length + 1) - 1;
  const modIdx = pickRandomModIdx(piece, pool);

  const mod = modIdx >= 0 ? pool.modifiers[modIdx] : undefined;
  const sockets = (piece?.socketCount ?? 0) + (mod?.grantsSocket === true ? 1 : 0);
  const gems: number[] = [];
  for (let s = 0; s < sockets; s++) {
    gems.push(pool.gems.length > 0 ? randInt(pool.gems.length) : -1);
  }

  return { enchIdx, modIdx, gems };
}

export function randomChromosome(pool: IndexedPool): Chromosome {
  const chestIdx = randInt(pool.chestplates.length);
  const legsIdx = randInt(pool.leggings.length);
  const accArr = pickDistinct(3, pool.accessories.length);
  const accIndices: [number, number, number] = [accArr[0] ?? 0, accArr[1] ?? 0, accArr[2] ?? 0];

  const enchantIndices: [number, number, number, number, number] = [0, 0, 0, 0, 0];
  const modIndices: [number, number, number, number, number] = [0, 0, 0, 0, 0];
  const gemIndices: number[][] = [];

  const pieces = [
    pool.chestplates[chestIdx],
    pool.leggings[legsIdx],
    pool.accessories[accIndices[0]],
    pool.accessories[accIndices[1]],
    pool.accessories[accIndices[2]],
  ];

  for (let i = 0; i < 5; i++) {
    const sg = randomSlotGenes(pieces[i], i, pool);
    enchantIndices[i] = sg.enchIdx;
    modIndices[i] = sg.modIdx;
    gemIndices.push(sg.gems);
  }

  return { chestIdx, legsIdx, accIndices, enchantIndices, modIndices, gemIndices };
}

// ---------------------------------------------------------------------------
// Crossover: uniform
// ---------------------------------------------------------------------------

export function uniformCrossover(
  a: Chromosome,
  b: Chromosome,
): [Chromosome, Chromosome] {
  const c1 = structuredClone(a);
  const c2 = structuredClone(b);
  swapEquipmentGenes(c1, c2, a, b);
  swapSlotGenes(c1, c2, a, b);
  return [c1, c2];
}

function swapEquipmentGenes(
  c1: Chromosome,
  c2: Chromosome,
  a: Chromosome,
  b: Chromosome,
): void {
  if (Math.random() < 0.5) { c1.chestIdx = b.chestIdx; c2.chestIdx = a.chestIdx; }
  if (Math.random() < 0.5) { c1.legsIdx = b.legsIdx; c2.legsIdx = a.legsIdx; }
  for (let i = 0; i < 3; i++) {
    if (Math.random() < 0.5) {
      c1.accIndices[i] = b.accIndices[i] ?? 0;
      c2.accIndices[i] = a.accIndices[i] ?? 0;
    }
  }
}

function swapSlotGenes(
  c1: Chromosome,
  c2: Chromosome,
  a: Chromosome,
  b: Chromosome,
): void {
  for (let i = 0; i < 5; i++) {
    if (Math.random() < 0.5) {
      c1.enchantIndices[i] = b.enchantIndices[i] ?? -1;
      c2.enchantIndices[i] = a.enchantIndices[i] ?? -1;
    }
    if (Math.random() < 0.5) {
      c1.modIndices[i] = b.modIndices[i] ?? -1;
      c2.modIndices[i] = a.modIndices[i] ?? -1;
    }
  }
}

// ---------------------------------------------------------------------------
// Mutation: pool-aware
// ---------------------------------------------------------------------------

export function mutate(chromo: Chromosome, pool: IndexedPool): void {
  const gene = randInt(6);
  if (gene === 0) { chromo.chestIdx = randInt(pool.chestplates.length); return; }
  if (gene === 1) { chromo.legsIdx = randInt(pool.leggings.length); return; }
  if (gene === 2) { chromo.accIndices[randInt(3)] = randInt(pool.accessories.length); return; }
  mutateSlotGene(chromo, gene, pool);
}

function mutateSlotGene(chromo: Chromosome, gene: number, pool: IndexedPool): void {
  const slot = randInt(5);
  if (gene === 3) {
    chromo.enchantIndices[slot] = randInt(getEnchantPool(slot, pool).length + 1) - 1;
  } else if (gene === 4) {
    const piece = getPieceForSlot(chromo, slot, pool);
    chromo.modIndices[slot] = pickRandomModIdx(piece, pool);
  } else {
    const slotGems = chromo.gemIndices[slot];
    if (slotGems != null && slotGems.length > 0) {
      slotGems[randInt(slotGems.length)] = pool.gems.length > 0 ? randInt(pool.gems.length) : -1;
    }
  }
}
