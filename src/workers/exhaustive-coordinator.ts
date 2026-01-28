/**
 * Exhaustive search coordinator — orchestrates parallel workers.
 *
 * Partitions chestplates across multiple workers using round-robin assignment,
 * aggregates progress from all workers, and merges results into final TopN.
 */

import type {
  GearPool,
  HardConstraints,
  SearchResult,
  SoftConstraint,
} from "@/models/types";
import type {
  ExhaustiveWorkerRequest,
  ExhaustiveWorkerResponse,
  PartitionedSearchRequest,
} from "./exhaustive-worker";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** Minimum combinations to justify parallel workers */
const PARALLEL_THRESHOLD = 10_000;

/** Maximum workers to spawn */
const MAX_WORKERS = 8;

/** Get optimal worker count based on hardware and workload */
function getWorkerCount(totalCombinations: number, chestCount: number): number {
  if (totalCombinations < PARALLEL_THRESHOLD) return 1;

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- may be undefined in non-browser
  const hwConcurrency = globalThis.navigator?.hardwareConcurrency ?? 4;

  // Don't spawn more workers than chestplates
  return Math.min(hwConcurrency, MAX_WORKERS, chestCount);
}

// ---------------------------------------------------------------------------
// Combination counting
// ---------------------------------------------------------------------------

function countTotalCombinations(pool: GearPool): number {
  const n = pool.accessories.length;
  const accCombos = n >= 3 ? (n * (n - 1) * (n - 2)) / 6 : 0;
  return pool.chestplates.length * pool.leggings.length * accCombos;
}

// ---------------------------------------------------------------------------
// Result merging
// ---------------------------------------------------------------------------

/** Merge results from multiple workers, keeping top N by score */
function mergeResults(
  allResults: readonly (readonly SearchResult[])[],
  maxResults: number,
): readonly SearchResult[] {
  const merged = allResults.flat();
  merged.sort((a, b) => b.score - a.score);
  return merged.slice(0, maxResults);
}

// ---------------------------------------------------------------------------
// Coordinator callbacks
// ---------------------------------------------------------------------------

export interface CoordinatorCallbacks {
  readonly onProgress: (checked: number, total: number, bestScore: number, topResults: readonly SearchResult[]) => void;
  readonly onComplete: (results: readonly SearchResult[]) => void;
  readonly onError: (message: string) => void;
}

// ---------------------------------------------------------------------------
// Coordinator class
// ---------------------------------------------------------------------------

export interface CoordinatorConfig {
  readonly gearPool: GearPool;
  readonly constraints: HardConstraints;
  readonly fitness: readonly SoftConstraint[];
  readonly maxResults: number;
}

export class ExhaustiveCoordinator {
  private workers: Worker[] = [];
  private workerProgress = new Map<number, { checked: number; total: number; bestScore: number; topResults: readonly SearchResult[] }>();
  private workerResults = new Map<number, readonly SearchResult[]>();
  private completedCount = 0;
  private expectedWorkerCount = 0;
  private callbacks: CoordinatorCallbacks | null = null;
  private config: CoordinatorConfig | null = null;

  start(config: CoordinatorConfig, callbacks: CoordinatorCallbacks): void {
    this.config = config;
    this.callbacks = callbacks;
    this.workerProgress.clear();
    this.workerResults.clear();
    this.completedCount = 0;

    const totalCombinations = countTotalCombinations(config.gearPool);
    const chestCount = config.gearPool.chestplates.length;
    const workerCount = getWorkerCount(totalCombinations, chestCount);
    this.expectedWorkerCount = workerCount;

    // Partition chestplates via round-robin
    const partitions: number[][] = Array.from({ length: workerCount }, () => []);
    for (let i = 0; i < chestCount; i++) {
      partitions[i % workerCount]?.push(i);
    }

    // Spawn workers
    for (let workerId = 0; workerId < workerCount; workerId++) {
      const assigned = partitions[workerId];
      if (assigned == null || assigned.length === 0) continue;

      this.workerProgress.set(workerId, { checked: 0, total: 0, bestScore: -Infinity, topResults: [] });
      this.spawnWorker(workerId, assigned, config);
    }
  }

  stop(): void {
    for (const worker of this.workers) {
      const stopMsg: ExhaustiveWorkerRequest = { type: "stop" };
      worker.postMessage(stopMsg);
      worker.terminate();
    }
    this.workers = [];
    this.callbacks = null;
  }

  private spawnWorker(workerId: number, assignedChestIndices: readonly number[], config: CoordinatorConfig): void {
    const worker = new Worker(
      new URL("./exhaustive-worker.ts", import.meta.url),
      { type: "module" },
    );

    worker.onmessage = (event: MessageEvent<ExhaustiveWorkerResponse>) => {
      this.handleWorkerMessage(event.data);
    };

    worker.onerror = () => {
      this.callbacks?.onError(`Worker ${String(workerId)} encountered an unexpected error`);
      this.stop();
    };

    this.workers.push(worker);

    const request: PartitionedSearchRequest = {
      type: "start",
      workerId,
      gearPool: config.gearPool,
      assignedChestIndices,
      constraints: config.constraints,
      fitness: [...config.fitness],
      maxResults: config.maxResults,
    };
    worker.postMessage(request);
  }

  private handleWorkerMessage(msg: ExhaustiveWorkerResponse): void {
    switch (msg.type) {
      case "progress":
        this.handleProgress(msg);
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

  private handleProgress(msg: ExhaustiveWorkerResponse & { type: "progress" }): void {
    this.workerProgress.set(msg.workerId, {
      checked: msg.checked,
      total: msg.total,
      bestScore: msg.bestScore,
      topResults: msg.topResults,
    });
    this.emitAggregatedProgress();
  }

  private handleComplete(msg: ExhaustiveWorkerResponse & { type: "complete" }): void {
    this.workerResults.set(msg.workerId, msg.results);
    this.completedCount++;

    // Update progress to show this worker as done with final results
    const progress = this.workerProgress.get(msg.workerId);
    if (progress != null) {
      this.workerProgress.set(msg.workerId, { ...progress, checked: progress.total, topResults: msg.results });
    }
    this.emitAggregatedProgress();

    // Check if all workers are done
    if (this.completedCount >= this.expectedWorkerCount) {
      this.finalizeResults();
    }
  }

  private emitAggregatedProgress(): void {
    let totalChecked = 0;
    let totalTotal = 0;
    let bestScore = -Infinity;
    const allTopResults: SearchResult[][] = [];

    for (const p of this.workerProgress.values()) {
      totalChecked += p.checked;
      totalTotal += p.total;
      if (p.bestScore > bestScore) bestScore = p.bestScore;
      if (p.topResults.length > 0) {
        allTopResults.push([...p.topResults]);
      }
    }

    // Merge top results from all workers
    const aggregatedResults = mergeResults(allTopResults, this.config?.maxResults ?? 20);
    this.callbacks?.onProgress(totalChecked, totalTotal, bestScore, aggregatedResults);
  }

  private finalizeResults(): void {
    const allResults = Array.from(this.workerResults.values());
    const merged = mergeResults(allResults, this.config?.maxResults ?? 20);

    // Terminate workers
    for (const worker of this.workers) {
      worker.terminate();
    }
    this.workers = [];

    this.callbacks?.onComplete(merged);
  }
}
