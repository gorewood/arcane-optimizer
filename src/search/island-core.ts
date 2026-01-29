/**
 * IslandCore — pure island logic without Worker dependencies.
 *
 * Wraps a GeneticSearch instance and exposes a callback-based interface
 * that can be driven by either a real Worker shell or a test harness.
 */

import type {
  GearPool,
  HardConstraints,
  SearchOptions,
  SearchResult,
  SoftConstraint,
} from "@/models/types";

import type { Chromosome, GAExitReason } from "@/search/genetic-core";
import { GeneticSearch } from "@/search/genetic-core";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** GA configuration for an island */
export interface IslandGAConfig {
  readonly gearPool: GearPool;
  readonly constraints: HardConstraints;
  readonly fitness: SoftConstraint[];
  readonly options: SearchOptions;
}

// ---------------------------------------------------------------------------
// Callbacks
// ---------------------------------------------------------------------------

/** Callbacks from island to coordinator/harness */
export interface IslandCallbacks {
  readonly onProgress: (
    generation: number,
    bestScore: number,
    topResults: readonly SearchResult[],
  ) => void;
  readonly onStagnating: () => void;
  readonly onMigrants: (individuals: Chromosome[]) => void;
  readonly onComplete: (
    results: readonly SearchResult[],
    exitReason: GAExitReason,
    finalGeneration: number,
  ) => void;
  readonly onError: (message: string) => void;
}

// ---------------------------------------------------------------------------
// IslandCore class
// ---------------------------------------------------------------------------

export class IslandCore {
  private search: GeneticSearch | null = null;
  private readonly islandId: number;
  private readonly callbacks: IslandCallbacks;

  constructor(islandId: number, callbacks: IslandCallbacks) {
    this.islandId = islandId;
    this.callbacks = callbacks;
  }

  /** Start the GA search */
  start(config: IslandGAConfig): void {
    this.search = new GeneticSearch();

    // Wire up callbacks
    this.search.onProgress = (checked, _total, bestScore, topResults) => {
      this.callbacks.onProgress(checked, bestScore, topResults);
    };

    this.search.onStagnating = () => {
      this.callbacks.onStagnating();
    };

    // Run the search
    const { gearPool, constraints, fitness, options } = config;
    this.search
      .search(gearPool, constraints, fitness, options)
      .then((results) => {
        this.callbacks.onComplete(
          results,
          this.search?.exitReason ?? "complete",
          this.search?.finalGeneration ?? 0,
        );
        this.search = null;
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : "Unknown island error";
        this.callbacks.onError(message);
        this.search = null;
      });
  }

  /** Stop the search */
  stop(): void {
    if (this.search != null) {
      this.search.cancel();
      this.search = null;
    }
  }

  /** Export top N individuals for migration */
  requestMigrants(count: number): void {
    if (this.search == null) return;
    const individuals = this.search.exportTopN(count);
    this.callbacks.onMigrants(individuals);
  }

  /** Receive migrants from another island */
  receiveMigrants(individuals: Chromosome[]): void {
    if (this.search == null) return;
    this.search.receiveMigrants(individuals);
  }

  /** Get island ID */
  get id(): number {
    return this.islandId;
  }

  /** Check if search is active */
  get isActive(): boolean {
    return this.search != null;
  }
}
