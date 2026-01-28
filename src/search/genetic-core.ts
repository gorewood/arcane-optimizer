/**
 * Genetic Algorithm search class — main loop and population management.
 */

import type {
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
import type { EvaluatedIndividual, IndexedPool } from "./genetic-chromosome";
import { repair } from "./genetic-repair";

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
// Selection: tournament (k=3)
// ---------------------------------------------------------------------------

function tournamentSelect(
  pop: readonly EvaluatedIndividual[],
): EvaluatedIndividual {
  let best = pop[randInt(pop.length)];
  for (let i = 1; i < 3; i++) {
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
    const key = ind.loadout.slots.map((s) =>
      `${s.piece.id}:${s.enchantment?.id ?? ""}:${s.modifier?.id ?? ""}`,
    ).join(",");
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
    repair(chromo, pool, constraints.maxUnwardedInsanity);
    const individual = evaluate(chromo, pool, constraints, fitness);
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

function evolveOneGeneration(
  params: EvolveParams,
  population: readonly EvaluatedIndividual[],
): EvaluatedIndividual[] {
  const { populationSize } = params;
  const nextPop: EvaluatedIndividual[] = [];

  // Elitism: keep top 2
  const sorted = [...population].sort((a, b) => b.score - a.score);
  const elite0 = sorted[0];
  const elite1 = sorted[1];
  if (elite0 != null) nextPop.push(elite0);
  if (elite1 != null) nextPop.push(elite1);

  while (nextPop.length < populationSize) {
    produceOffspring(params, population, nextPop);
  }

  return nextPop.slice(0, populationSize);
}

function produceOffspring(
  params: EvolveParams,
  population: readonly EvaluatedIndividual[],
  nextPop: EvaluatedIndividual[],
): void {
  const { pool, constraints, fitness, mutationRate, crossoverRate } = params;
  const p1 = tournamentSelect(population);
  const p2 = tournamentSelect(population);

  const [c1, c2] = Math.random() < crossoverRate
    ? uniformCrossover(p1.chromosome, p2.chromosome)
    : [structuredClone(p1.chromosome), structuredClone(p2.chromosome)];

  if (Math.random() < mutationRate) mutate(c1, pool);
  if (Math.random() < mutationRate) mutate(c2, pool);

  repair(c1, pool, constraints.maxUnwardedInsanity);
  repair(c2, pool, constraints.maxUnwardedInsanity);

  const eval1 = evaluate(c1, pool, constraints, fitness);
  const eval2 = evaluate(c2, pool, constraints, fitness);
  if (eval1 != null) nextPop.push(eval1);
  if (eval2 != null) nextPop.push(eval2);
}

// ---------------------------------------------------------------------------
// GA generation loop (extracted to reduce complexity)
// ---------------------------------------------------------------------------

interface LoopState {
  population: EvaluatedIndividual[];
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
}

/** Max diversity injections before final stagnation exit. */
const MAX_INJECTIONS = 2;
/** Stagnation threshold that triggers diversity injection. */
const INJECTION_THRESHOLD = 25;
/** Stagnation threshold for final exit (after all injections used). */
const STAGNATION_LIMIT = 50;

async function runEvolutionLoop(
  config: LoopConfig,
  state: LoopState,
): Promise<void> {
  const { evolveParams, generations, maxResults, token, onProgress } = config;
  for (let gen = 0; gen < generations; gen++) {
    if (token.cancelled) {
      state.finalGeneration = gen;
      state.exitReason = "cancelled";
      break;
    }

    state.population = evolveOneGeneration(evolveParams, state.population);
    updateStagnation(state);
    const currentResults = extractResults(state.population, maxResults);
    onProgress?.(gen + 1, generations, state.bestScore, currentResults);

    if (shouldInjectDiversity(state)) {
      injectDiversity(state, evolveParams);
    } else if (state.stagnation > STAGNATION_LIMIT) {
      state.finalGeneration = gen + 1;
      state.exitReason = "stagnation";
      break;
    }

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
  const finalResults = extractResults(state.population, maxResults);
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

// ---------------------------------------------------------------------------
// GeneticSearch
// ---------------------------------------------------------------------------

/** Exit reason for GA search */
export type GAExitReason = "complete" | "stagnation" | "cancelled";

export class GeneticSearch implements SearchStrategy {
  readonly name = "genetic";
  onProgress?: ((checked: number, total: number, bestScore: number, results: readonly SearchResult[]) => void) | undefined;
  private readonly token: CancellationToken = { cancelled: false };

  /** Exit reason from last search (available after search completes) */
  exitReason: GAExitReason = "complete";
  /** Final generation reached (available after search completes) */
  finalGeneration = 0;
  /** Total generations configured (available after search completes) */
  totalGenerations = 0;

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
    const pool = buildIndexedPool(gearPool);
    const populationSize = options.populationSize ?? 200;
    const generations = options.generations ?? 500;
    const mutationRate = options.mutationRate ?? 0.15;
    const crossoverRate = options.crossoverRate ?? 0.8;

    this.totalGenerations = generations;

    const population = initPopulation(pool, constraints, fitness, populationSize);
    const evolveParams: EvolveParams = {
      pool, constraints, fitness, populationSize, mutationRate, crossoverRate,
    };

    const state: LoopState = {
      population,
      bestScore: population[0]?.score ?? -Infinity,
      stagnation: 0,
      injections: 0,
      finalGeneration: 0,
      exitReason: "complete",
    };

    await runEvolutionLoop(
      { evolveParams, generations, maxResults: options.maxResults, token: this.token, onProgress: this.onProgress },
      state,
    );

    // Expose exit metadata
    this.exitReason = state.exitReason;
    this.finalGeneration = state.finalGeneration;

    return extractResults(state.population, options.maxResults);
  }
}
