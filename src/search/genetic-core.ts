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
}

interface LoopConfig {
  readonly evolveParams: EvolveParams;
  readonly generations: number;
  readonly token: CancellationToken;
  readonly onProgress: ((checked: number, total: number, bestScore: number) => void) | undefined;
}

async function runEvolutionLoop(
  config: LoopConfig,
  state: LoopState,
): Promise<void> {
  const { evolveParams, generations, token, onProgress } = config;
  for (let gen = 0; gen < generations; gen++) {
    if (token.cancelled) break;

    state.population = evolveOneGeneration(evolveParams, state.population);
    updateStagnation(state);
    onProgress?.(gen + 1, generations, state.bestScore);

    if (state.stagnation > 50) break;
    if (gen % 10 === 0) {
      await new Promise<void>((r) => { setTimeout(r, 0); });
    }
  }
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

export class GeneticSearch implements SearchStrategy {
  readonly name = "genetic";
  onProgress?: ((checked: number, total: number, bestScore: number) => void) | undefined;
  private readonly token: CancellationToken = { cancelled: false };

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
    const mutationRate = options.mutationRate ?? 0.05;
    const crossoverRate = options.crossoverRate ?? 0.8;

    const population = initPopulation(pool, constraints, fitness, populationSize);
    const evolveParams: EvolveParams = {
      pool, constraints, fitness, populationSize, mutationRate, crossoverRate,
    };

    const state: LoopState = {
      population,
      bestScore: population[0]?.score ?? -Infinity,
      stagnation: 0,
    };

    await runEvolutionLoop(
      { evolveParams, generations, token: this.token, onProgress: this.onProgress },
      state,
    );

    return extractResults(state.population, options.maxResults);
  }
}
