/**
 * Island Coordinator — orchestrates multiple GA island workers.
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
import type { IslandGAConfig, IslandRequest, IslandResponse } from "./island-worker";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** Maximum islands to spawn */
const MAX_ISLANDS = 8;

/** Number of individuals to migrate */
const MIGRATION_COUNT = 2;

/** Get optimal island count based on hardware */
function getIslandCount(): number {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- may be undefined in non-browser
  const hwConcurrency = globalThis.navigator?.hardwareConcurrency ?? 4;
  return Math.min(hwConcurrency, MAX_ISLANDS);
}

// ---------------------------------------------------------------------------
// Result merging
// ---------------------------------------------------------------------------

/** Merge results from multiple islands, keeping top N unique by score */
function mergeResults(
  allResults: readonly (readonly SearchResult[])[],
  maxResults: number,
): readonly SearchResult[] {
  const merged = allResults.flat();
  merged.sort((a, b) => b.score - a.score);

  // Dedupe by loadout fingerprint
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

export interface IslandCoordinatorCallbacks {
  readonly onProgress: (generation: number, total: number, bestScore: number, topResults: readonly SearchResult[]) => void;
  readonly onComplete: (results: readonly SearchResult[], exitMetadata: ExitMetadata) => void;
  readonly onError: (message: string) => void;
}

// ---------------------------------------------------------------------------
// Coordinator class
// ---------------------------------------------------------------------------

export interface IslandCoordinatorConfig {
  readonly gearPool: GearPool;
  readonly constraints: HardConstraints;
  readonly fitness: readonly SoftConstraint[];
  readonly maxResults: number;
  readonly populationSize?: number;
  readonly generations?: number;
  readonly mutationRate?: number;
}

interface IslandState {
  worker: Worker;
  generation: number;
  bestScore: number;
  topResults: readonly SearchResult[];
  completed: boolean;
  finalResults: readonly SearchResult[];
  exitReason: GAExitReason;
  finalGeneration: number;
}

export class IslandCoordinator {
  private islands = new Map<number, IslandState>();
  private callbacks: IslandCoordinatorCallbacks | null = null;
  private config: IslandCoordinatorConfig | null = null;
  private totalGenerations = 0;
  private islandCount = 0;

  start(config: IslandCoordinatorConfig, callbacks: IslandCoordinatorCallbacks): void {
    this.config = config;
    this.callbacks = callbacks;
    this.islands.clear();

    this.islandCount = getIslandCount();
    const generations = config.generations ?? 1000;
    this.totalGenerations = generations * this.islandCount;

    // Spawn island workers
    for (let islandId = 0; islandId < this.islandCount; islandId++) {
      this.spawnIsland(islandId, config, generations);
    }
  }

  stop(): void {
    for (const state of this.islands.values()) {
      const stopMsg: IslandRequest = { type: "stop" };
      state.worker.postMessage(stopMsg);
      state.worker.terminate();
    }
    this.islands.clear();
    this.callbacks = null;
  }

  private spawnIsland(islandId: number, config: IslandCoordinatorConfig, generations: number): void {
    const worker = new Worker(
      new URL("./island-worker.ts", import.meta.url),
      { type: "module" },
    );

    const state: IslandState = {
      worker,
      generation: 0,
      bestScore: -Infinity,
      topResults: [],
      completed: false,
      finalResults: [],
      exitReason: "complete",
      finalGeneration: 0,
    };
    this.islands.set(islandId, state);

    worker.onmessage = (event: MessageEvent<IslandResponse>) => {
      this.handleIslandMessage(event.data);
    };

    worker.onerror = () => {
      this.callbacks?.onError(`Island ${String(islandId)} encountered an unexpected error`);
      this.stop();
    };

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

    const startMsg: IslandRequest = { type: "start", config: gaConfig, islandId };
    worker.postMessage(startMsg);
  }

  private handleIslandMessage(msg: IslandResponse): void {
    switch (msg.type) {
      case "progress":
        this.handleProgress(msg);
        break;
      case "stagnating":
        this.handleStagnating(msg);
        break;
      case "migrants":
        this.handleMigrants(msg);
        break;
      case "complete":
        this.handleComplete(msg);
        break;
      case "error":
        this.callbacks?.onError(msg.message);
        this.stop();
        break;
    }
  }

  private handleProgress(msg: IslandResponse & { type: "progress" }): void {
    const state = this.islands.get(msg.islandId);
    if (state == null) return;

    state.generation = msg.generation;
    state.bestScore = msg.bestScore;
    state.topResults = msg.topResults;

    this.emitAggregatedProgress();
  }

  private handleStagnating(msg: IslandResponse & { type: "stagnating" }): void {
    // Request migrants from ring neighbor
    const neighborId = (msg.islandId + 1) % this.islandCount;
    const neighborState = this.islands.get(neighborId);
    if (neighborState == null || neighborState.completed) return;

    const request: IslandRequest = { type: "requestMigrants", count: MIGRATION_COUNT };
    neighborState.worker.postMessage(request);
  }

  private handleMigrants(msg: IslandResponse & { type: "migrants" }): void {
    // Forward migrants to the stagnating island (ring predecessor)
    const recipientId = (msg.islandId - 1 + this.islandCount) % this.islandCount;
    const recipientState = this.islands.get(recipientId);
    if (recipientState == null || recipientState.completed) return;

    this.deliverMigrants(recipientState, msg.individuals);
  }

  private deliverMigrants(recipient: IslandState, individuals: Chromosome[]): void {
    const request: IslandRequest = { type: "receiveMigrants", individuals };
    recipient.worker.postMessage(request);
  }

  private handleComplete(msg: IslandResponse & { type: "complete" }): void {
    const state = this.islands.get(msg.islandId);
    if (state == null) return;

    state.completed = true;
    state.finalResults = msg.results;
    state.exitReason = msg.exitReason;
    state.finalGeneration = msg.finalGeneration;

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

    // Terminate workers
    for (const state of this.islands.values()) {
      state.worker.terminate();
    }
    this.islands.clear();

    this.callbacks?.onComplete(merged, exitMetadata);
  }
}
