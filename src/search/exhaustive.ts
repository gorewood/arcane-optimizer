/**
 * Exhaustive search strategy — enumerates all valid equipment
 * combinations and scores each against soft constraints.
 *
 * Supports enhancement assignment modes:
 * - "none": bare equipment only (MVP behavior)
 * - "greedy": greedy per-slot enhancement assignment
 * - "budget-aware": greedy with insanity/drawback budget tracking
 */

import type {
  EquipmentPiece,
  EquippedSlot,
  GearPool,
  HardConstraints,
  Loadout,
  SearchOptions,
  SearchResult,
  SearchStrategy,
  SoftConstraint,
  StatName,
  Stats,
} from "@/models/types";

import { computeLoadoutStats } from "./stats";
import { validateLoadout } from "./constraints";
import { computeFitness } from "./fitness";
import {
  budgetAwareAssign,
  greedyAssignEnhancements,
} from "./enhance";
import type { EnhancedLoadoutResult } from "./enhance";
import type { EnhancementMode } from "./enhance";

// ---------------------------------------------------------------------------
// Async yield helper
// ---------------------------------------------------------------------------

/** Yield control to the event loop (keeps workers responsive). */
async function yieldToEventLoop(): Promise<void> {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });
}

// ---------------------------------------------------------------------------
// TopNTracker — maintains a sorted descending list of best results
// ---------------------------------------------------------------------------

/** Tracks the top N search results by score (highest first). */
export class TopNTracker {
  private readonly results: SearchResult[] = [];
  private readonly maxResults: number;

  constructor(maxResults: number) {
    this.maxResults = maxResults;
  }

  /** Minimum score worth inserting (for pruning). */
  get worstScore(): number {
    if (this.results.length < this.maxResults) return -Infinity;
    const last = this.results[this.results.length - 1];
    return last?.score ?? -Infinity;
  }

  /** Try to insert a result. Rejects scores at or below worstScore when full. */
  tryInsert(result: SearchResult): void {
    if (
      this.results.length >= this.maxResults &&
      result.score <= this.worstScore
    ) {
      return;
    }
    const insertIdx = this.findInsertionIndex(result.score);
    this.results.splice(insertIdx, 0, result);
    if (this.results.length > this.maxResults) {
      this.results.pop();
    }
  }

  /** Return the current top results (descending by score). */
  getResults(): readonly SearchResult[] {
    return this.results;
  }

  /** Binary search for the correct insertion index (descending). */
  private findInsertionIndex(score: number): number {
    let lo = 0;
    let hi = this.results.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      const midResult = this.results[mid];
      if (midResult != null && midResult.score > score) {
        lo = mid + 1;
      } else {
        hi = mid;
      }
    }
    return lo;
  }
}

// ---------------------------------------------------------------------------
// Accessory combination generator
// ---------------------------------------------------------------------------

/** Yield all unique 3-combinations from an accessories array. */
export function* generateAccessoryCombinations(
  accessories: readonly EquipmentPiece[],
  constraints: HardConstraints,
): Generator<
  readonly [EquipmentPiece, EquipmentPiece, EquipmentPiece]
> {
  const n = accessories.length;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      for (let k = j + 1; k < n; k++) {
        const a = accessories[i];
        const b = accessories[j];
        const c = accessories[k];
        if (a == null || b == null || c == null) continue;
        if (isValidAccTriplet([a, b, c], constraints)) {
          yield [a, b, c] as const;
        }
      }
    }
  }
}

/** Check if an accessory triplet satisfies helmet/amulet limits. */
function isValidAccTriplet(
  triplet: readonly [EquipmentPiece, EquipmentPiece, EquipmentPiece],
  constraints: HardConstraints,
): boolean {
  let helmets = 0;
  let amulets = 0;
  for (const piece of triplet) {
    if (piece.slot === "accessory-H") helmets++;
    if (piece.slot === "accessory-A") amulets++;
  }
  return (
    helmets <= constraints.maxHelmetAccessories &&
    amulets <= constraints.maxAmuletAccessories
  );
}

// ---------------------------------------------------------------------------
// Loadout builder helpers
// ---------------------------------------------------------------------------

/** Build a bare EquippedSlot (no enchantments/modifiers/gems). */
function bareSlot(piece: EquipmentPiece): EquippedSlot {
  return { piece, gems: [] };
}

/** Build a Loadout from 5 equipment pieces (no enhancements). */
function buildBareLoadout(
  chest: EquipmentPiece,
  legs: EquipmentPiece,
  acc: readonly [EquipmentPiece, EquipmentPiece, EquipmentPiece],
): Loadout {
  return {
    slots: [
      bareSlot(chest),
      bareSlot(legs),
      bareSlot(acc[0]),
      bareSlot(acc[1]),
      bareSlot(acc[2]),
    ],
  };
}

// ---------------------------------------------------------------------------
// Combination count helper
// ---------------------------------------------------------------------------

/** Count total combinations: chests * legs * C(accessories, 3). */
function countCombinations(pool: GearPool): number {
  const n = pool.accessories.length;
  const accCombos = n >= 3 ? (n * (n - 1) * (n - 2)) / 6 : 0;
  return pool.chestplates.length * pool.leggings.length * accCombos;
}

// ---------------------------------------------------------------------------
// Score a single loadout candidate
// ---------------------------------------------------------------------------

interface ScoreInput {
  readonly loadout: Loadout;
  readonly constraints: HardConstraints;
  readonly fitness: readonly SoftConstraint[];
  readonly atlanteanChoices?: ReadonlyMap<number, StatName> | undefined;
}

/** Validate and score a loadout. Returns null if invalid or disqualified. */
function scoreLoadout(input: ScoreInput): SearchResult | null {
  const { loadout, constraints, fitness, atlanteanChoices } = input;
  const validation = validateLoadout(loadout, constraints);
  if (!validation.valid) return null;

  const stats: Stats = computeLoadoutStats(loadout, atlanteanChoices);
  const score = computeFitness(stats, fitness);
  if (score === -Infinity) return null;

  return { loadout, score, stats, atlanteanChoices };
}

// ---------------------------------------------------------------------------
// Cancellation token
// ---------------------------------------------------------------------------

/** Mutable cancellation flag (avoids TS narrowing issues with class fields). */
interface CancellationToken {
  cancelled: boolean;
}

// ---------------------------------------------------------------------------
// Enhancement wrapper
// ---------------------------------------------------------------------------

interface EnhanceConfig {
  readonly pool: GearPool;
  readonly constraints: HardConstraints;
  readonly fitness: readonly SoftConstraint[];
  readonly mode: EnhancementMode;
}

function enhanceLoadout(
  loadout: Loadout,
  config: EnhanceConfig,
): EnhancedLoadoutResult | null {
  if (config.mode === "none") return null;
  const { pool, constraints, fitness } = config;
  if (config.mode === "budget-aware") {
    return budgetAwareAssign(loadout, pool, constraints, fitness);
  }
  return greedyAssignEnhancements(loadout, pool, constraints, fitness);
}

// ---------------------------------------------------------------------------
// Search loop (extracted to satisfy max-lines-per-function)
// ---------------------------------------------------------------------------

interface SearchLoopParams {
  readonly gearPool: GearPool;
  readonly constraints: HardConstraints;
  readonly fitness: readonly SoftConstraint[];
  readonly enhancementMode: EnhancementMode;
}

interface SearchLoopConfig {
  readonly tracker: TopNTracker;
  readonly token: CancellationToken;
  readonly deadline: number | undefined;
  readonly total: number;
}

/** Score one equipment combo and insert into tracker if viable. */
function processCombo(
  bareLoadout: Loadout,
  enhanceConfig: EnhanceConfig,
  tracker: TopNTracker,
): void {
  const enhanced = enhanceLoadout(bareLoadout, enhanceConfig);
  const finalLoadout = enhanced?.loadout ?? bareLoadout;
  const result = scoreLoadout({
    loadout: finalLoadout,
    constraints: enhanceConfig.constraints,
    fitness: enhanceConfig.fitness,
    atlanteanChoices: enhanced?.atlanteanChoices,
  });
  if (result != null) tracker.tryInsert(result);
}

/** Run the main search loop, yielding periodically. */
async function runSearchLoop(
  params: SearchLoopParams,
  config: SearchLoopConfig,
  onProgress: ((checked: number, total: number, best: number) => void) | undefined,
): Promise<void> {
  const { gearPool, constraints, fitness, enhancementMode } = params;
  const { tracker, token, deadline, total } = config;
  const enhanceConfig: EnhanceConfig = {
    pool: gearPool, constraints, fitness, mode: enhancementMode,
  };
  let checked = 0;

  for (const chest of gearPool.chestplates) {
    for (const legs of gearPool.leggings) {
      const accGen = generateAccessoryCombinations(gearPool.accessories, constraints);
      for (const acc of accGen) {
        if (token.cancelled || (deadline != null && Date.now() > deadline)) {
          // Report final progress before early exit so bar reaches end
          emitProgress(onProgress, total, total, tracker);
          return;
        }

        processCombo(buildBareLoadout(chest, legs, acc), enhanceConfig, tracker);

        checked++;
        if (checked % 1000 === 0) {
          emitProgress(onProgress, checked, total, tracker);
          await yieldToEventLoop();
        }
      }
    }
  }

  emitProgress(onProgress, total, total, tracker);
}

/** Emit progress if callback is defined. */
function emitProgress(
  cb: ((checked: number, total: number, best: number) => void) | undefined,
  checked: number,
  total: number,
  tracker: TopNTracker,
): void {
  if (cb == null) return;
  const best = tracker.getResults()[0];
  cb(checked, total, best?.score ?? -Infinity);
}

// ---------------------------------------------------------------------------
// ExhaustiveSearch
// ---------------------------------------------------------------------------

/** Exhaustive search over all valid equipment combinations. */
export class ExhaustiveSearch implements SearchStrategy {
  readonly name = "exhaustive";
  onProgress?:
    | ((checked: number, total: number, bestScore: number) => void)
    | undefined;

  private readonly token: CancellationToken = { cancelled: false };

  /** Request cancellation of the running search. */
  cancel(): void {
    this.token.cancelled = true;
  }

  async search(
    gearPool: GearPool,
    constraints: HardConstraints,
    fitness: readonly SoftConstraint[],
    options: SearchOptions,
  ): Promise<readonly SearchResult[]> {
    this.token.cancelled = false;
    const tracker = new TopNTracker(options.maxResults);
    const total = countCombinations(gearPool);
    const deadline = options.timeout != null
      ? Date.now() + options.timeout
      : undefined;

    const enhancementMode: EnhancementMode = options.enhancementMode ?? "none";

    await runSearchLoop(
      { gearPool, constraints, fitness, enhancementMode },
      { tracker, token: this.token, deadline, total },
      this.onProgress,
    );

    return tracker.getResults();
  }
}
