/**
 * CoordinatorCore — pure orchestration logic without Worker dependencies.
 *
 * Uses ring topology for migration: Island 0→1→2→...→N-1→0
 * When an island stagnates, it requests migrants from its ring neighbor.
 * Progress is aggregated as sum of generations across all islands.
 */

import type {
  GearPool,
  HardConstraints,
  SearchResult,
  SoftConstraint,
} from "@/models/types";

import type { Chromosome, GAExitReason } from "@/search/genetic-core";
import type { ExitMetadata } from "@/stores/search-store";
import type { IslandCallbacks, IslandGAConfig } from "./island-core";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** Number of individuals to migrate */
const MIGRATION_COUNT = 2;

// ---------------------------------------------------------------------------
// Island handle interface
// ---------------------------------------------------------------------------

/** Abstract handle for controlling an island (real worker or mock) */
export interface IslandHandle {
  start(config: IslandGAConfig): void;
  stop(): void;
  requestMigrants(count: number): void;
  receiveMigrants(individuals: Chromosome[]): void;
}

/** Factory function to create island handles */
export type IslandFactory = (id: number, callbacks: IslandCallbacks) => IslandHandle;

// ---------------------------------------------------------------------------
// Result merging
// ---------------------------------------------------------------------------

/** Merge results from multiple islands, keeping top N unique by score */
export function mergeResults(
  allResults: readonly (readonly SearchResult[])[],
  maxResults: number,
): readonly SearchResult[] {
  const merged = allResults.flat();
  merged.sort((a, b) => b.score - a.score);

  // Dedupe by loadout fingerprint (piece IDs only)
  const seen = new Set<string>();
  const unique: SearchResult[] = [];
  for (const r of merged) {
    const key = r.loadout.slots.map((s) => s.piece.id).join(",");
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(r);
    if (unique.length >= maxResults) break;
  }
  return unique;
}

// ---------------------------------------------------------------------------
// Coordinator callbacks
// ---------------------------------------------------------------------------

export interface CoordinatorCallbacks {
  readonly onProgress: (
    generation: number,
    total: number,
    bestScore: number,
    topResults: readonly SearchResult[],
  ) => void;
  readonly onComplete: (results: readonly SearchResult[], exitMetadata: ExitMetadata) => void;
  readonly onError: (message: string) => void;
}

// ---------------------------------------------------------------------------
// Coordinator config
// ---------------------------------------------------------------------------

export interface CoordinatorConfig {
  readonly gearPool: GearPool;
  readonly constraints: HardConstraints;
  readonly fitness: readonly SoftConstraint[];
  readonly maxResults: number;
  readonly populationSize?: number;
  readonly generations?: number;
  readonly mutationRate?: number;
}

// ---------------------------------------------------------------------------
// Internal island state
// ---------------------------------------------------------------------------

interface IslandState {
  handle: IslandHandle;
  generation: number;
  bestScore: number;
  topResults: readonly SearchResult[];
  completed: boolean;
  finalResults: readonly SearchResult[];
  exitReason: GAExitReason;
  finalGeneration: number;
}

// ---------------------------------------------------------------------------
// CoordinatorCore class
// ---------------------------------------------------------------------------

export class CoordinatorCore {
  private readonly islandFactory: IslandFactory;
  private readonly islandCount: number;
  private islands = new Map<number, IslandState>();
  private callbacks: CoordinatorCallbacks | null = null;
  private config: CoordinatorConfig | null = null;
  private totalGenerations = 0;

  constructor(islandFactory: IslandFactory, islandCount: number) {
    this.islandFactory = islandFactory;
    this.islandCount = islandCount;
  }

  /** Start the coordinated search */
  start(config: CoordinatorConfig, callbacks: CoordinatorCallbacks): void {
    this.config = config;
    this.callbacks = callbacks;
    this.islands.clear();

    const generations = config.generations ?? 1000;
    this.totalGenerations = generations * this.islandCount;

    // Spawn islands
    for (let islandId = 0; islandId < this.islandCount; islandId++) {
      this.spawnIsland(islandId, config, generations);
    }
  }

  /** Stop all islands */
  stop(): void {
    for (const state of this.islands.values()) {
      state.handle.stop();
    }
    this.islands.clear();
    this.callbacks = null;
  }

  /** Get current island count */
  get activeIslandCount(): number {
    return this.islands.size;
  }

  private spawnIsland(islandId: number, config: CoordinatorConfig, generations: number): void {
    const islandCallbacks: IslandCallbacks = {
      onProgress: (gen, bestScore, topResults) => {
        this.handleProgress(islandId, gen, bestScore, topResults);
      },
      onStagnating: () => {
        this.handleStagnating(islandId);
      },
      onMigrants: (individuals) => {
        this.handleMigrants(islandId, individuals);
      },
      onComplete: (results, exitReason, finalGeneration) => {
        this.handleComplete(islandId, results, exitReason, finalGeneration);
      },
      onError: (message) => {
        this.callbacks?.onError(`Island ${String(islandId)}: ${message}`);
        this.stop();
      },
    };

    const handle = this.islandFactory(islandId, islandCallbacks);

    const state: IslandState = {
      handle,
      generation: 0,
      bestScore: -Infinity,
      topResults: [],
      completed: false,
      finalResults: [],
      exitReason: "complete",
      finalGeneration: 0,
    };
    this.islands.set(islandId, state);

    const gaConfig: IslandGAConfig = {
      gearPool: config.gearPool,
      constraints: config.constraints,
      fitness: [...config.fitness],
      options: {
        maxResults: config.maxResults,
        populationSize: config.populationSize,
        generations,
        mutationRate: config.mutationRate,
      },
    };

    handle.start(gaConfig);
  }

  private handleProgress(
    islandId: number,
    generation: number,
    bestScore: number,
    topResults: readonly SearchResult[],
  ): void {
    const state = this.islands.get(islandId);
    if (state == null) return;

    state.generation = generation;
    state.bestScore = bestScore;
    state.topResults = topResults;

    this.emitAggregatedProgress();
  }

  private handleStagnating(islandId: number): void {
    // Request migrants from ring neighbor
    const neighborId = (islandId + 1) % this.islandCount;
    const neighborState = this.islands.get(neighborId);
    if (neighborState == null || neighborState.completed) return;

    neighborState.handle.requestMigrants(MIGRATION_COUNT);
  }

  private handleMigrants(islandId: number, individuals: Chromosome[]): void {
    // Forward migrants to the stagnating island (ring predecessor)
    const recipientId = (islandId - 1 + this.islandCount) % this.islandCount;
    const recipientState = this.islands.get(recipientId);
    if (recipientState == null || recipientState.completed) return;

    recipientState.handle.receiveMigrants(individuals);
  }

  private handleComplete(
    islandId: number,
    results: readonly SearchResult[],
    exitReason: GAExitReason,
    finalGeneration: number,
  ): void {
    const state = this.islands.get(islandId);
    if (state == null) return;

    state.completed = true;
    state.finalResults = results;
    state.exitReason = exitReason;
    state.finalGeneration = finalGeneration;

    // Update progress to show completion
    this.emitAggregatedProgress();

    // Check if all islands are done
    const allComplete = Array.from(this.islands.values()).every((s) => s.completed);
    if (allComplete) {
      this.finalizeResults();
    }
  }

  private emitAggregatedProgress(): void {
    let totalGeneration = 0;
    let bestScore = -Infinity;
    const allTopResults: SearchResult[][] = [];

    for (const state of this.islands.values()) {
      totalGeneration += state.generation;
      if (state.bestScore > bestScore) bestScore = state.bestScore;
      if (state.topResults.length > 0) {
        allTopResults.push([...state.topResults]);
      }
    }

    const aggregatedResults = mergeResults(allTopResults, this.config?.maxResults ?? 20);
    this.callbacks?.onProgress(totalGeneration, this.totalGenerations, bestScore, aggregatedResults);
  }

  private finalizeResults(): void {
    const allResults = Array.from(this.islands.values()).map((s) => s.finalResults);
    const merged = mergeResults(allResults, this.config?.maxResults ?? 20);

    // Determine aggregate exit reason
    let finalGeneration = 0;
    let totalGenerationsConfigured = 0;
    let anyStagnation = false;
    for (const state of this.islands.values()) {
      finalGeneration += state.finalGeneration;
      totalGenerationsConfigured += this.config?.generations ?? 1000;
      if (state.exitReason === "stagnation") anyStagnation = true;
    }

    const exitMetadata: ExitMetadata = {
      reason: anyStagnation ? "stagnation" : "complete",
      finalGeneration,
      totalGenerations: totalGenerationsConfigured,
    };

    this.callbacks?.onComplete(merged, exitMetadata);
  }
}
