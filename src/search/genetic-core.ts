/**
 * Genetic Algorithm search class — main loop and population management.
 */

import type {
  EquipmentPiece,
  ExpandedEquipment,
  GearPool,
  HardConstraints,
  SearchOptions,
  SearchResult,
  SearchStrategy,
  SoftConstraint,
} from "@/models/types";

import {
  buildIndexedPool,
  evaluate,
  mutate,
  randomChromosome,
  uniformCrossover,
} from "./genetic-chromosome";
import type { Chromosome, EvaluatedIndividual, IndexedPool } from "./genetic-chromosome";
import { repair } from "./genetic-repair";

// Re-export Chromosome for island worker migration protocol
export type { Chromosome } from "./genetic-chromosome";

/**
 * Safely extract appliedVariant from a piece that may be ExpandedEquipment.
 */
function getAppliedVariant(piece: EquipmentPiece | ExpandedEquipment): string {
  if ("appliedVariant" in piece) {
    return piece.appliedVariant ?? "";
  }
  return "";
}

/**
 * Generate a unique key for a loadout based on piece identity only.
 * Used for elite archive to track best config for each piece combination.
 */
function getPieceKey(ind: EvaluatedIndividual): string {
  return ind.loadout.slots.map((s) => {
    const variantKey = getAppliedVariant(s.piece);
    return `${s.piece.id}:${variantKey}`;
  }).join(",");
}

// ---------------------------------------------------------------------------
// Cancellation token
// ---------------------------------------------------------------------------

interface CancellationToken {
  cancelled: boolean;
}

// ---------------------------------------------------------------------------
// Random helpers
// ---------------------------------------------------------------------------

function randInt(max: number): number {
  return Math.floor(Math.random() * max);
}

// ---------------------------------------------------------------------------
// Diversity measurement
// ---------------------------------------------------------------------------

/** Measure population diversity as ratio of unique piece combos to population size. */
function measureDiversity(pop: readonly EvaluatedIndividual[]): number {
  if (pop.length === 0) return 0;
  const uniqueKeys = new Set(pop.map(getPieceKey));
  return uniqueKeys.size / pop.length;
}

// ---------------------------------------------------------------------------
// Selection: tournament (k=3, or k=2 for reduced pressure)
// ---------------------------------------------------------------------------

function tournamentSelect(
  pop: readonly EvaluatedIndividual[],
  tournamentSize = 3,
): EvaluatedIndividual {
  let best = pop[randInt(pop.length)];
  for (let i = 1; i < tournamentSize; i++) {
    const candidate = pop[randInt(pop.length)];
    if (candidate != null && (best == null || candidate.score > best.score)) {
      best = candidate;
    }
  }
  const fallback = pop[0];
  if (best != null) return best;
  if (fallback != null) return fallback;
  throw new Error("tournamentSelect called with empty population");
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
    // Dedup by piece identity only (id + variant) — same pieces with different
    // enchants/mods are consolidated to the highest-scoring configuration
    const key = ind.loadout.slots.map((s) => {
      const variantKey = getAppliedVariant(s.piece);
      return `${s.piece.id}:${variantKey}`;
    }).join(",");
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

// ---------------------------------------------------------------------------
// Population initialization
// ---------------------------------------------------------------------------

function initPopulation(
  pool: IndexedPool,
  constraints: HardConstraints,
  fitness: readonly SoftConstraint[],
  size: number,
): EvaluatedIndividual[] {
  const pop: EvaluatedIndividual[] = [];
  let attempts = 0;
  const maxAttempts = size * 20;

  while (pop.length < size && attempts < maxAttempts) {
    attempts++;
    const chromo = randomChromosome(pool);
    repair(chromo, pool, undefined);
    const individual = evaluate({ chromo, pool, constraints, fitness });
    if (individual != null) pop.push(individual);
  }

  return pop;
}

// ---------------------------------------------------------------------------
// Evolution step
// ---------------------------------------------------------------------------

interface EvolveParams {
  readonly pool: IndexedPool;
  readonly constraints: HardConstraints;
  readonly fitness: readonly SoftConstraint[];
  readonly populationSize: number;
  readonly mutationRate: number;
  readonly crossoverRate: number;
}

/** Diversity threshold below which we boost mutation and reduce selection pressure. */
const DIVERSITY_THRESHOLD = 0.3;
/** Mutation rate multiplier when diversity is low. */
const LOW_DIVERSITY_MUTATION_BOOST = 3;

function evolveOneGeneration(
  params: EvolveParams,
  population: readonly EvaluatedIndividual[],
): EvaluatedIndividual[] {
  const { populationSize } = params;
  const nextPop: EvaluatedIndividual[] = [];

  // Measure diversity and adapt parameters
  const diversity = measureDiversity(population);
  const isLowDiversity = diversity < DIVERSITY_THRESHOLD;
  const adaptedParams: EvolveParams = isLowDiversity
    ? { ...params, mutationRate: Math.min(params.mutationRate * LOW_DIVERSITY_MUTATION_BOOST, 0.5) }
    : params;
  const tournamentSize = isLowDiversity ? 2 : 3;

  // Elitism: keep top 2
  const sorted = [...population].sort((a, b) => b.score - a.score);
  const elite0 = sorted[0];
  const elite1 = sorted[1];
  if (elite0 != null) nextPop.push(elite0);
  if (elite1 != null) nextPop.push(elite1);

  while (nextPop.length < populationSize) {
    produceOffspring(adaptedParams, population, nextPop, tournamentSize);
  }

  return nextPop.slice(0, populationSize);
}

function produceOffspring(
  params: EvolveParams,
  population: readonly EvaluatedIndividual[],
  nextPop: EvaluatedIndividual[],
  tournamentSize: number,
): void {
  const { pool, constraints, fitness, mutationRate, crossoverRate } = params;
  const p1 = tournamentSelect(population, tournamentSize);
  const p2 = tournamentSelect(population, tournamentSize);

  const [c1, c2] = Math.random() < crossoverRate
    ? uniformCrossover(p1.chromosome, p2.chromosome)
    : [structuredClone(p1.chromosome), structuredClone(p2.chromosome)];

  if (Math.random() < mutationRate) mutate(c1, pool);
  if (Math.random() < mutationRate) mutate(c2, pool);

  repair(c1, pool, undefined);
  repair(c2, pool, undefined);

  const eval1 = evaluate({ chromo: c1, pool, constraints, fitness });
  const eval2 = evaluate({ chromo: c2, pool, constraints, fitness });
  if (eval1 != null) nextPop.push(eval1);
  if (eval2 != null) nextPop.push(eval2);
}

// ---------------------------------------------------------------------------
// GA generation loop (extracted to reduce complexity)
// ---------------------------------------------------------------------------

interface LoopState {
  population: EvaluatedIndividual[];
  /** Elite archive: best individual for each unique piece combination */
  archive: Map<string, EvaluatedIndividual>;
  bestScore: number;
  stagnation: number;
  injections: number;
  finalGeneration: number;
  exitReason: "complete" | "stagnation" | "cancelled";
}

interface LoopConfig {
  readonly evolveParams: EvolveParams;
  readonly generations: number;
  readonly maxResults: number;
  readonly token: CancellationToken;
  readonly onProgress: ((checked: number, total: number, bestScore: number, results: readonly SearchResult[]) => void) | undefined;
  readonly onStagnating: (() => void) | undefined;
  readonly getMigrants: (() => Chromosome[]) | undefined;
}

/** Max diversity injections before final stagnation exit. */
const MAX_INJECTIONS = 4;
/** Stagnation threshold that triggers diversity injection. */
const INJECTION_THRESHOLD = 20;
/** Stagnation threshold for final exit (after all injections used). */
const STAGNATION_LIMIT = 50;

/** Incorporate migrant chromosomes from another island into population. */
function incorporateMigrants(
  state: LoopState,
  migrants: Chromosome[],
  params: EvolveParams,
): void {
  const { pool, constraints, fitness, populationSize } = params;

  // Evaluate migrants
  const evaluatedMigrants: EvaluatedIndividual[] = [];
  for (const chromo of migrants) {
    repair(chromo, pool, undefined);
    const ind = evaluate({ chromo, pool, constraints, fitness });
    if (ind != null) evaluatedMigrants.push(ind);
  }

  if (evaluatedMigrants.length === 0) return;

  // Replace worst individuals with migrants
  const sorted = [...state.population].sort((a, b) => b.score - a.score);
  const keepCount = populationSize - evaluatedMigrants.length;
  state.population = [...sorted.slice(0, keepCount), ...evaluatedMigrants];
  state.stagnation = 0;
}

/** Handle stagnation with migration or diversity injection. Returns true if search should exit. */
function handleStagnation(
  state: LoopState,
  gen: number,
  config: LoopConfig,
): boolean {
  if (state.stagnation <= INJECTION_THRESHOLD) return false;

  const { evolveParams, onStagnating, getMigrants } = config;
  const migrants = getMigrants?.();

  // Try migrants first
  if (migrants != null && migrants.length > 0) {
    incorporateMigrants(state, migrants, evolveParams);
    return false;
  }

  // Notify coordinator if available, but still use diversity injection
  if (onStagnating != null) {
    onStagnating();
    if (state.injections < MAX_INJECTIONS) {
      injectDiversity(state, evolveParams);
      return false;
    }
  } else if (shouldInjectDiversity(state)) {
    injectDiversity(state, evolveParams);
    return false;
  }

  // Check for final exit
  if (state.stagnation > STAGNATION_LIMIT) {
    state.finalGeneration = gen + 1;
    state.exitReason = "stagnation";
    return true;
  }
  return false;
}

/** Extract results from archive + population combined. */
function extractResultsWithArchive(
  state: LoopState,
  maxResults: number,
): readonly SearchResult[] {
  // Merge archive with current population for extraction
  const archiveIndividuals = [...state.archive.values()];
  const combined = [...archiveIndividuals, ...state.population];
  return extractResults(combined, maxResults);
}

/** Critical diversity threshold - inject fresh individuals if diversity drops below this. */
const CRITICAL_DIVERSITY_THRESHOLD = 0.25;
/** Max diversity injections from low diversity (separate from stagnation injections). */
const MAX_DIVERSITY_INJECTIONS = 3;

async function runEvolutionLoop(
  config: LoopConfig,
  state: LoopState,
): Promise<void> {
  const { evolveParams, generations, maxResults, token, onProgress } = config;
  // Archive size limit: 2x maxResults to capture diverse solutions
  const archiveLimit = maxResults * 2;
  let diversityInjections = 0;

  for (let gen = 0; gen < generations; gen++) {
    if (token.cancelled) {
      state.finalGeneration = gen;
      state.exitReason = "cancelled";
      break;
    }

    state.population = evolveOneGeneration(evolveParams, state.population);
    updateStagnation(state);
    updateArchive(state, archiveLimit);

    // Proactive diversity injection when population becomes too homogeneous
    const diversity = measureDiversity(state.population);
    if (diversity < CRITICAL_DIVERSITY_THRESHOLD && diversityInjections < MAX_DIVERSITY_INJECTIONS) {
      injectDiversity(state, evolveParams);
      diversityInjections++;
    }

    const currentResults = extractResultsWithArchive(state, maxResults);
    onProgress?.(gen + 1, generations, state.bestScore, currentResults);

    if (handleStagnation(state, gen, config)) break;

    if (gen % 10 === 0) {
      await new Promise<void>((r) => { setTimeout(r, 0); });
    }

    // Mark complete if we finish all generations
    if (gen === generations - 1) {
      state.finalGeneration = generations;
      state.exitReason = "complete";
    }
  }
  // Report 100% completion so progress bar reaches the end
  const finalResults = extractResultsWithArchive(state, maxResults);
  onProgress?.(generations, generations, state.bestScore, finalResults);
}

function shouldInjectDiversity(state: LoopState): boolean {
  return state.stagnation > INJECTION_THRESHOLD
    && state.injections < MAX_INJECTIONS;
}

function injectDiversity(state: LoopState, params: EvolveParams): void {
  const { pool, constraints, fitness, populationSize } = params;
  const sorted = [...state.population].sort((a, b) => b.score - a.score);
  const keepCount = Math.floor(populationSize * 0.8);
  const survivors = sorted.slice(0, keepCount);

  const freshIndividuals = initPopulation(
    pool, constraints, fitness, populationSize - keepCount,
  );

  state.population = [...survivors, ...freshIndividuals];
  state.stagnation = 0;
  state.injections++;
}

function updateStagnation(state: LoopState): void {
  const genBest = state.population[0]?.score ?? -Infinity;
  if (genBest > state.bestScore) {
    state.bestScore = genBest;
    state.stagnation = 0;
  } else {
    state.stagnation++;
  }
}

/** Update elite archive with best individuals for each unique piece combination. */
function updateArchive(state: LoopState, maxArchiveSize: number): void {
  for (const ind of state.population) {
    const key = getPieceKey(ind);
    const existing = state.archive.get(key);
    if (existing == null || ind.score > existing.score) {
      state.archive.set(key, ind);
    }
  }
  // Trim archive to max size (keep highest-scoring entries)
  if (state.archive.size > maxArchiveSize) {
    const sorted = [...state.archive.entries()].sort((a, b) => b[1].score - a[1].score);
    state.archive = new Map(sorted.slice(0, maxArchiveSize));
  }
}

// ---------------------------------------------------------------------------
// GeneticSearch
// ---------------------------------------------------------------------------

/** Exit reason for GA search */
export type GAExitReason = "complete" | "stagnation" | "cancelled";

export class GeneticSearch implements SearchStrategy {
  readonly name = "genetic";
  onProgress?: ((checked: number, total: number, bestScore: number, results: readonly SearchResult[]) => void) | undefined;
  /** Called when search is stagnating and wants migrants from another island */
  onStagnating?: (() => void) | undefined;
  private readonly token: CancellationToken = { cancelled: false };

  /** Exit reason from last search (available after search completes) */
  exitReason: GAExitReason = "complete";
  /** Final generation reached (available after search completes) */
  finalGeneration = 0;
  /** Total generations configured (available after search completes) */
  totalGenerations = 0;

  /** Current population (accessible for migration export) */
  private currentPopulation: EvaluatedIndividual[] = [];
  /** Queue of migrant chromosomes to incorporate */
  private migrantQueue: Chromosome[] = [];

  cancel(): void {
    this.token.cancelled = true;
  }

  /**
   * Export top N chromosomes from current population for migration.
   * Called by island coordinator when another island requests migrants.
   */
  exportTopN(n: number): Chromosome[] {
    const sorted = [...this.currentPopulation].sort((a, b) => b.score - a.score);
    return sorted.slice(0, n).map((ind) => structuredClone(ind.chromosome));
  }

  /**
   * Receive migrant chromosomes from another island.
   * Called by island coordinator when migrants arrive.
   */
  receiveMigrants(chromosomes: Chromosome[]): void {
    this.migrantQueue.push(...chromosomes);
  }

  async search(
    gearPool: GearPool,
    constraints: HardConstraints,
    fitness: readonly SoftConstraint[],
    options: SearchOptions,
  ): Promise<readonly SearchResult[]> {
    this.token.cancelled = false;
    this.migrantQueue = [];
    const pool = buildIndexedPool(gearPool);
    const populationSize = options.populationSize ?? 200;
    const generations = options.generations ?? 500;
    const mutationRate = options.mutationRate ?? 0.15;
    const crossoverRate = options.crossoverRate ?? 0.8;

    this.totalGenerations = generations;

    const population = initPopulation(pool, constraints, fitness, populationSize);
    this.currentPopulation = population;
    const evolveParams: EvolveParams = {
      pool, constraints, fitness, populationSize, mutationRate, crossoverRate,
    };

    const state: LoopState = {
      population,
      archive: new Map(),
      bestScore: population[0]?.score ?? -Infinity,
      stagnation: 0,
      injections: 0,
      finalGeneration: 0,
      exitReason: "complete",
    };

    // Get migrants from queue (called each generation)
    const getMigrants = (): Chromosome[] => {
      if (this.migrantQueue.length === 0) return [];
      const migrants = [...this.migrantQueue];
      this.migrantQueue = [];
      return migrants;
    };

    await runEvolutionLoop(
      {
        evolveParams,
        generations,
        maxResults: options.maxResults,
        token: this.token,
        onProgress: (checked, total, bestScore, results) => {
          // Keep currentPopulation in sync for exportTopN
          this.currentPopulation = state.population;
          this.onProgress?.(checked, total, bestScore, results);
        },
        onStagnating: this.onStagnating,
        getMigrants,
      },
      state,
    );

    // Expose exit metadata
    this.exitReason = state.exitReason;
    this.finalGeneration = state.finalGeneration;

    return extractResultsWithArchive(state, options.maxResults);
  }
}
