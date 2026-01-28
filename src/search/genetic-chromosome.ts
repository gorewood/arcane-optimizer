/**
 * GA chromosome representation, decoding, random generation,
 * crossover, mutation, and repair.
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
  SearchResult,
  SoftConstraint,
  StatName,
  Stats,
} from "@/models/types";

import { validateLoadout } from "./constraints";
import { computeFitness } from "./fitness";
import { computeLoadoutStats, getValidAtlanteanChoices } from "./stats";

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
  atlanteanChoices: number[];
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

function getPieceForSlot(
  chromo: Chromosome,
  slotIdx: number,
  pool: IndexedPool,
): EquipmentPiece | undefined {
  if (slotIdx === 0) return pool.chestplates[chromo.chestIdx];
  if (slotIdx === 1) return pool.leggings[chromo.legsIdx];
  return pool.accessories[chromo.accIndices[slotIdx - 2] ?? 0];
}

function pickRandomModIdx(
  piece: EquipmentPiece | undefined,
  pool: IndexedPool,
): number {
  if (piece?.setName != null) {
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
  // Set pieces can only have the Atlantean modifier
  const modifier = (piece.setName != null && rawModifier?.atlanteanBehavior == null)
    ? undefined
    : rawModifier;

  const gems = resolveGems(piece, modifier, chromo.gemIndices[slotIdx] ?? [], pool);
  const slot: EquippedSlot = { piece, enchantment, modifier, gems };

  resolveAtlanteanSlot(slot, slotIdx, chromo, atlanteanMap);
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
  chromo: Chromosome,
  atlanteanMap: Map<number, StatName>,
): void {
  if (slot.modifier?.atlanteanBehavior == null) return;
  const validChoices = getValidAtlanteanChoices(slot);
  const choiceIdx = chromo.atlanteanChoices[slotIdx] ?? -1;
  if (choiceIdx >= 0 && choiceIdx < validChoices.length) {
    const chosen = validChoices[choiceIdx];
    if (chosen != null) atlanteanMap.set(slotIdx, chosen);
  }
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
): { enchIdx: number; modIdx: number; gems: number[]; atlChoice: number } {
  const enchPool = getEnchantPool(slotIdx, pool);
  const enchIdx = randInt(enchPool.length + 1) - 1;
  const modIdx = pickRandomModIdx(piece, pool);

  const mod = modIdx >= 0 ? pool.modifiers[modIdx] : undefined;
  const sockets = (piece?.socketCount ?? 0) + (mod?.grantsSocket === true ? 1 : 0);
  const gems: number[] = [];
  for (let s = 0; s < sockets; s++) {
    gems.push(pool.gems.length > 0 ? randInt(pool.gems.length) : -1);
  }

  const atlChoice = mod?.atlanteanBehavior != null ? randInt(6) : -1;
  return { enchIdx, modIdx, gems, atlChoice };
}

export function randomChromosome(pool: IndexedPool): Chromosome {
  const chestIdx = randInt(pool.chestplates.length);
  const legsIdx = randInt(pool.leggings.length);
  const accArr = pickDistinct(3, pool.accessories.length);
  const accIndices: [number, number, number] = [accArr[0] ?? 0, accArr[1] ?? 0, accArr[2] ?? 0];

  const enchantIndices: [number, number, number, number, number] = [0, 0, 0, 0, 0];
  const modIndices: [number, number, number, number, number] = [0, 0, 0, 0, 0];
  const gemIndices: number[][] = [];
  const atlanteanChoices: number[] = [];

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
    atlanteanChoices.push(sg.atlChoice);
  }

  return { chestIdx, legsIdx, accIndices, enchantIndices, modIndices, gemIndices, atlanteanChoices };
}

// ---------------------------------------------------------------------------
// Selection: tournament (k=3)
// ---------------------------------------------------------------------------

export function tournamentSelect(
  pop: readonly EvaluatedIndividual[],
): EvaluatedIndividual {
  let best = pop[randInt(pop.length)];
  for (let i = 1; i < 3; i++) {
    const candidate = pop[randInt(pop.length)];
    if (candidate != null && (best == null || candidate.score > best.score)) {
      best = candidate;
    }
  }
  // Fallback (should never happen with non-empty pop)
  const fallback = pop[0];
  if (best != null) return best;
  if (fallback != null) return fallback;
  throw new Error("tournamentSelect called with empty population");
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
  const gene = randInt(7);
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
  } else if (gene === 5) {
    const slotGems = chromo.gemIndices[slot];
    if (slotGems != null && slotGems.length > 0) {
      slotGems[randInt(slotGems.length)] = pool.gems.length > 0 ? randInt(pool.gems.length) : -1;
    }
  } else {
    chromo.atlanteanChoices[slot] = randInt(7) - 1;
  }
}

// ---------------------------------------------------------------------------
// Repair
// ---------------------------------------------------------------------------

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function repair(chromo: Chromosome, pool: IndexedPool): void {
  chromo.chestIdx = clamp(chromo.chestIdx, 0, pool.chestplates.length - 1);
  chromo.legsIdx = clamp(chromo.legsIdx, 0, pool.leggings.length - 1);
  repairAccessories(chromo, pool);
  for (let i = 0; i < 5; i++) {
    repairSlotIndices(chromo, i, pool);
  }
}

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

function repairSetModifier(chromo: Chromosome, i: number, pool: IndexedPool): void {
  const piece = getPieceForSlot(chromo, i, pool);
  if (piece?.setName == null) return;
  const modIdx = chromo.modIndices[i] ?? -1;
  if (modIdx < 0) return;
  const mod = pool.modifiers[modIdx];
  if (mod != null && mod.atlanteanBehavior == null) {
    chromo.modIndices[i] = pool.setModifierIndices[0] ?? -1;
  }
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
// Extract results from population
// ---------------------------------------------------------------------------

export function extractResults(
  population: readonly EvaluatedIndividual[],
  maxResults: number,
): readonly SearchResult[] {
  const sorted = [...population].sort((a, b) => b.score - a.score);
  const seen = new Set<string>();
  const results: SearchResult[] = [];

  for (const ind of sorted) {
    const key = ind.loadout.slots.map((s) => s.piece.id).join(",");
    if (seen.has(key)) continue;
    seen.add(key);
    results.push({
      loadout: ind.loadout,
      score: ind.score,
      stats: ind.stats,
      atlanteanChoices: ind.atlanteanMap,
    });
    if (results.length >= maxResults) break;
  }

  return results;
}
