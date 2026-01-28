/**
 * Enhancement assignment engine — assigns enchantments, modifiers, gems,
 * and Atlantean bonuses to bare equipment loadouts.
 *
 * All functions are pure — no side effects, no mutation.
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

import { computeSlotStats } from "./constraints";
import { computeFitness } from "./fitness";
import {
  ATLANTEAN_BONUS_VALUES,
  emptyStats,
  getValidAtlanteanChoices,
  STAT_NAMES,
  sumStats,
} from "./stats";

// ---------------------------------------------------------------------------
// Enhancement mode type
// ---------------------------------------------------------------------------

export type EnhancementMode = "none" | "greedy" | "budget-aware";

// ---------------------------------------------------------------------------
// Slot classification
// ---------------------------------------------------------------------------

type SlotCategory = "armor" | "accessory";

function slotCategory(slot: EquippedSlot): SlotCategory {
  const s = slot.piece.slot;
  return s === "chestplate" || s === "leggings" ? "armor" : "accessory";
}

// ---------------------------------------------------------------------------
// Enchantment filtering
// ---------------------------------------------------------------------------

function getApplicableEnchantments(
  category: SlotCategory,
  enchantments: readonly Enchantment[],
): readonly Enchantment[] {
  return enchantments.filter((e) => e.applicableTo.includes(category));
}

// ---------------------------------------------------------------------------
// Modifier filtering — set pieces can only use Atlantean
// ---------------------------------------------------------------------------

function getApplicableModifiers(
  piece: EquipmentPiece,
  modifiers: readonly Modifier[],
): readonly Modifier[] {
  if (piece.setName != null) {
    return modifiers.filter((m) => m.atlanteanBehavior != null);
  }
  return modifiers;
}

// ---------------------------------------------------------------------------
// Atlantean compatibility check
// ---------------------------------------------------------------------------

function isAtlanteanCompatible(
  enchantment: Enchantment | undefined,
  modifier: Modifier | undefined,
  hardConstraints: HardConstraints,
): boolean {
  if (enchantment == null || modifier?.atlanteanBehavior == null) return true;
  return !hardConstraints.atlanteanIncompatibleWith.includes(enchantment.id);
}

// ---------------------------------------------------------------------------
// Socket count for a slot given modifier
// ---------------------------------------------------------------------------

function getSocketCount(
  slot: EquippedSlot,
  modifier: Modifier | undefined,
): number {
  return slot.piece.socketCount + (modifier?.grantsSocket === true ? 1 : 0);
}

// ---------------------------------------------------------------------------
// Greedy gem assignment — pick best gem per socket
// ---------------------------------------------------------------------------

function greedyAssignGems(
  baseStats: Stats,
  availableGems: readonly Gem[],
  socketCount: number,
  fitness: readonly SoftConstraint[],
): readonly Gem[] {
  if (socketCount <= 0 || availableGems.length === 0) return [];

  const gems: Gem[] = [];
  let currentStats = baseStats;

  for (let s = 0; s < socketCount; s++) {
    let bestGem: Gem | undefined;
    let bestScore = -Infinity;

    for (const gem of availableGems) {
      const trialStats = sumStats(currentStats, gem.stats);
      const score = computeFitness(trialStats, fitness);
      if (score > bestScore) {
        bestScore = score;
        bestGem = gem;
      }
    }

    if (bestGem != null) {
      gems.push(bestGem);
      currentStats = sumStats(currentStats, bestGem.stats);
    }
  }

  return gems;
}

// ---------------------------------------------------------------------------
// Stat helpers
// ---------------------------------------------------------------------------

function subtractStats(a: Stats, b: Stats): Stats {
  const result = emptyStats();
  for (const name of STAT_NAMES) {
    result[name] = a[name] - b[name];
  }
  return result;
}

function computeEnhancedSlotContribution(
  slot: EquippedSlot,
  atlanteanChoice: StatName | null,
): Stats {
  const slotStats = sumStats(computeSlotStats(slot));
  if (atlanteanChoice != null && slot.modifier?.atlanteanBehavior != null) {
    const bonus = ATLANTEAN_BONUS_VALUES[atlanteanChoice];
    if (bonus !== 0) {
      slotStats[atlanteanChoice] += bonus;
    }
  }
  return slotStats;
}

// ---------------------------------------------------------------------------
// Compute stats for a loadout with one slot enhanced
// ---------------------------------------------------------------------------

function computeLoadoutStatsWithSlot(
  otherSlotStats: Stats,
  slot: EquippedSlot,
  atlanteanChoice: StatName | null,
): Stats {
  const slotStats = computeSlotStats(slot);
  const result = sumStats(otherSlotStats, slotStats);

  if (atlanteanChoice != null && slot.modifier?.atlanteanBehavior != null) {
    const bonus = ATLANTEAN_BONUS_VALUES[atlanteanChoice];
    if (bonus !== 0) {
      result[atlanteanChoice] += bonus;
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Best Atlantean choice for a slot
// ---------------------------------------------------------------------------

function pickBestAtlanteanChoice(
  slot: EquippedSlot,
  otherSlotStats: Stats,
  fitness: readonly SoftConstraint[],
): StatName | null {
  const choices = getValidAtlanteanChoices(slot);
  if (choices.length === 0) return null;

  let bestChoice: StatName | null = null;
  let bestScore = computeFitness(
    computeLoadoutStatsWithSlot(otherSlotStats, slot, null),
    fitness,
  );

  for (const choice of choices) {
    const stats = computeLoadoutStatsWithSlot(otherSlotStats, slot, choice);
    const score = computeFitness(stats, fitness);
    if (score > bestScore) {
      bestScore = score;
      bestChoice = choice;
    }
  }

  return bestChoice;
}

// ---------------------------------------------------------------------------
// Score an enhanced slot candidate
// ---------------------------------------------------------------------------

interface SlotCandidate {
  readonly enchantment: Enchantment | undefined;
  readonly modifier: Modifier | undefined;
  readonly gems: readonly Gem[];
  readonly atlanteanChoice: StatName | null;
  readonly score: number;
}

// ---------------------------------------------------------------------------
// Evaluate one (enchantment, modifier) pair for a slot
// ---------------------------------------------------------------------------

interface EvalContext {
  readonly slot: EquippedSlot;
  readonly pool: GearPool;
  readonly otherSlotStats: Stats;
  readonly fitness: readonly SoftConstraint[];
}

function evaluateEnchantModPair(
  ctx: EvalContext,
  enchantment: Enchantment | undefined,
  modifier: Modifier | undefined,
): SlotCandidate {
  const sockets = getSocketCount(ctx.slot, modifier);
  const enhancedSlot: EquippedSlot = {
    piece: ctx.slot.piece,
    enchantment,
    modifier,
    gems: [],
  };

  const baseSlotStats = computeSlotStats(enhancedSlot);
  const baseTotal = sumStats(ctx.otherSlotStats, baseSlotStats);
  const gems = greedyAssignGems(baseTotal, ctx.pool.gems, sockets, ctx.fitness);

  const fullSlot: EquippedSlot = {
    piece: ctx.slot.piece,
    enchantment,
    modifier,
    gems,
  };

  const atlanteanChoice = modifier?.atlanteanBehavior != null
    ? pickBestAtlanteanChoice(fullSlot, ctx.otherSlotStats, ctx.fitness)
    : null;

  const finalStats = computeLoadoutStatsWithSlot(
    ctx.otherSlotStats, fullSlot, atlanteanChoice,
  );
  const score = computeFitness(finalStats, ctx.fitness);

  return { enchantment, modifier, gems, atlanteanChoice, score };
}

// ---------------------------------------------------------------------------
// Find best enhancement for a single slot
// ---------------------------------------------------------------------------

interface FindBestParams {
  readonly slot: EquippedSlot;
  readonly pool: GearPool;
  readonly hardConstraints: HardConstraints;
  readonly otherSlotStats: Stats;
  readonly fitness: readonly SoftConstraint[];
}

function findBestSlotEnhancement(params: FindBestParams): SlotCandidate {
  const { slot, pool, hardConstraints, otherSlotStats, fitness } = params;
  const category = slotCategory(slot);
  const enchantments = getApplicableEnchantments(category, pool.enchantments);
  const applicableMods = getApplicableModifiers(slot.piece, pool.modifiers);

  const enchantOptions: readonly (Enchantment | undefined)[] = [
    undefined, ...enchantments,
  ];
  const modOptions: readonly (Modifier | undefined)[] = [
    undefined, ...applicableMods,
  ];

  const ctx: EvalContext = { slot, pool, otherSlotStats, fitness };
  let best: SlotCandidate = {
    enchantment: undefined, modifier: undefined,
    gems: [], atlanteanChoice: null, score: -Infinity,
  };

  for (const ench of enchantOptions) {
    for (const mod of modOptions) {
      if (!isAtlanteanCompatible(ench, mod, hardConstraints)) continue;
      const candidate = evaluateEnchantModPair(ctx, ench, mod);
      if (candidate.score > best.score) best = candidate;
    }
  }

  return best;
}

// ---------------------------------------------------------------------------
// Apply enhancement to a slot
// ---------------------------------------------------------------------------

function applyEnhancement(
  slot: EquippedSlot,
  candidate: SlotCandidate,
): EquippedSlot {
  return {
    piece: slot.piece,
    enchantment: candidate.enchantment,
    modifier: candidate.modifier,
    gems: candidate.gems,
  };
}

// ---------------------------------------------------------------------------
// Slot state tracking for iterative assignment
// ---------------------------------------------------------------------------

interface SlotAssignState {
  readonly slots: [EquippedSlot, EquippedSlot, EquippedSlot, EquippedSlot, EquippedSlot];
  readonly atlanteanChoices: Map<number, StatName>;
  runningTotal: Stats;
  contributions: Stats[];
}

function initSlotState(loadout: Loadout): SlotAssignState {
  const slots = [...loadout.slots] as [
    EquippedSlot, EquippedSlot, EquippedSlot, EquippedSlot, EquippedSlot,
  ];
  const atlanteanChoices = new Map<number, StatName>();
  let runningTotal = emptyStats();
  const contributions: Stats[] = [];

  for (const slot of slots) {
    const stats = sumStats(computeSlotStats(slot));
    contributions.push(stats);
    runningTotal = sumStats(runningTotal, stats);
  }

  return { slots, atlanteanChoices, runningTotal, contributions };
}

function updateSlotState(
  state: SlotAssignState,
  index: number,
  best: SlotCandidate,
): void {
  const oldContribution = state.contributions[index];
  if (oldContribution == null) return;

  const currentSlot = state.slots[index];
  if (currentSlot == null) return;
  state.slots[index] = applyEnhancement(currentSlot, best);
  if (best.atlanteanChoice != null) {
    state.atlanteanChoices.set(index, best.atlanteanChoice);
  }

  const newContribution = computeEnhancedSlotContribution(
    state.slots[index], best.atlanteanChoice,
  );
  state.runningTotal = sumStats(
    subtractStats(state.runningTotal, oldContribution),
    newContribution,
  );
  state.contributions[index] = newContribution;
}

// ---------------------------------------------------------------------------
// Greedy enhancement assignment (public)
// ---------------------------------------------------------------------------

export interface EnhancedLoadoutResult {
  readonly loadout: Loadout;
  readonly atlanteanChoices: ReadonlyMap<number, StatName>;
}

export function greedyAssignEnhancements(
  loadout: Loadout,
  pool: GearPool,
  hardConstraints: HardConstraints,
  fitness: readonly SoftConstraint[],
): EnhancedLoadoutResult {
  const state = initSlotState(loadout);

  for (let i = 0; i < state.slots.length; i++) {
    const slot = state.slots[i];
    if (slot == null) continue;
    const contribution = state.contributions[i];
    if (contribution == null) continue;

    const otherStats = subtractStats(state.runningTotal, contribution);
    const best = findBestSlotEnhancement({
      slot, pool, hardConstraints, otherSlotStats: otherStats, fitness,
    });

    updateSlotState(state, i, best);
  }

  return { loadout: { slots: state.slots }, atlanteanChoices: state.atlanteanChoices };
}

// ---------------------------------------------------------------------------
// Budget-aware enhancement assignment (public)
// ---------------------------------------------------------------------------

export function budgetAwareAssign(
  loadout: Loadout,
  pool: GearPool,
  hardConstraints: HardConstraints,
  fitness: readonly SoftConstraint[],
): EnhancedLoadoutResult {
  const state = initSlotState(loadout);
  let remainingDrawback = hardConstraints.maxDrawback;

  for (let i = 0; i < state.slots.length; i++) {
    const slot = state.slots[i];
    if (slot == null) continue;
    const contribution = state.contributions[i];
    if (contribution == null) continue;

    const otherStats = subtractStats(state.runningTotal, contribution);
    const best = findBestBudgetSlot({
      slot, pool, hardConstraints, otherSlotStats: otherStats, fitness,
    }, state.runningTotal, remainingDrawback);

    updateSlotState(state, i, best);
    remainingDrawback -= candidateDrawback(best);
  }

  return { loadout: { slots: state.slots }, atlanteanChoices: state.atlanteanChoices };
}

// ---------------------------------------------------------------------------
// Budget-aware slot search
// ---------------------------------------------------------------------------

function findBestBudgetSlot(
  params: FindBestParams,
  currentStats: Stats,
  drawbackBudget: number,
): SlotCandidate {
  const { slot, pool, hardConstraints, otherSlotStats, fitness } = params;
  const category = slotCategory(slot);
  const enchantments = getApplicableEnchantments(category, pool.enchantments);
  const applicableMods = getApplicableModifiers(slot.piece, pool.modifiers);
  const ctx: EvalContext = { slot, pool, otherSlotStats, fitness };

  let best: SlotCandidate = {
    enchantment: undefined, modifier: undefined,
    gems: [], atlanteanChoice: null, score: -Infinity,
  };

  for (const ench of [undefined, ...enchantments]) {
    for (const mod of [undefined, ...applicableMods]) {
      if (!isAtlanteanCompatible(ench, mod, hardConstraints)) continue;
      const candidate = evaluateEnchantModPair(ctx, ench, mod);
      if (!insanityWithinBudget(candidate, currentStats, hardConstraints)) continue;
      if (candidateDrawback(candidate) > drawbackBudget) continue;
      if (candidate.score > best.score) best = candidate;
    }
  }

  return best;
}

// ---------------------------------------------------------------------------
// Budget helpers
// ---------------------------------------------------------------------------

function sumStatFromSources(
  stat: StatName,
  ench: Enchantment | undefined,
  mod: Modifier | undefined,
  gems: readonly Gem[],
): number {
  let total = ench?.stats[stat] ?? 0;
  total += mod?.stats[stat] ?? 0;
  for (const gem of gems) {
    total += gem.stats[stat] ?? 0;
  }
  return total;
}

function candidateInsanity(c: SlotCandidate): number {
  let insanity = sumStatFromSources("insanity", c.enchantment, c.modifier, c.gems);
  if (c.modifier?.atlanteanBehavior != null) {
    insanity += c.modifier.atlanteanBehavior.insanity;
  }
  return insanity;
}

function candidateWarding(c: SlotCandidate): number {
  return sumStatFromSources("warding", c.enchantment, c.modifier, c.gems);
}

/**
 * Check whether adding this candidate keeps insanity within safe bounds.
 * Game rule: insanity <= max(warding, maxUnwardedInsanity).
 */
function insanityWithinBudget(
  c: SlotCandidate,
  currentStats: Stats,
  hardConstraints: HardConstraints,
): boolean {
  const newInsanity = currentStats.insanity + candidateInsanity(c);
  const newWarding = currentStats.warding + candidateWarding(c);
  return newInsanity <= Math.max(newWarding, hardConstraints.maxUnwardedInsanity);
}

function candidateDrawback(c: SlotCandidate): number {
  return sumStatFromSources("drawback", c.enchantment, c.modifier, c.gems);
}
