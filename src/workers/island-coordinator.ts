/**
 * IslandCoordinator — Worker-based wrapper around CoordinatorCore.
 *
 * Creates real Web Workers and adapts the message protocol to the
 * IslandHandle interface expected by CoordinatorCore.
 */

import type {
  GearPool,
  HardConstraints,
  SearchResult,
  SoftConstraint,
} from "@/models/types";

import type { Chromosome } from "@/search/genetic-core";
import type { ExitMetadata } from "@/stores/search-store";
import type { IslandCallbacks, IslandGAConfig } from "@/search/island-core";
import { CoordinatorCore, type IslandFactory, type IslandHandle } from "@/search/coordinator-core";
import type { IslandRequest, IslandResponse } from "./island-worker";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** Maximum islands to spawn */
const MAX_ISLANDS = 8;

/** Get optimal island count based on hardware */
function getIslandCount(): number {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- may be undefined in non-browser
  const hwConcurrency = globalThis.navigator?.hardwareConcurrency ?? 4;
  return Math.min(hwConcurrency, MAX_ISLANDS);
}

// ---------------------------------------------------------------------------
// Worker-based island handle
// ---------------------------------------------------------------------------

/** Creates an IslandHandle backed by a real Web Worker */
function createWorkerHandle(islandId: number, callbacks: IslandCallbacks): IslandHandle {
  const worker = new Worker(
    new URL("./island-worker.ts", import.meta.url),
    { type: "module" },
  );

  worker.onmessage = (event: MessageEvent<IslandResponse>) => {
    const msg = event.data;
    switch (msg.type) {
      case "progress":
        callbacks.onProgress(msg.generation, msg.bestScore, msg.topResults);
        break;
      case "stagnating":
        callbacks.onStagnating();
        break;
      case "migrants":
        callbacks.onMigrants(msg.individuals);
        break;
      case "complete":
        callbacks.onComplete(msg.results, msg.exitReason, msg.finalGeneration);
        break;
      case "error":
        callbacks.onError(msg.message);
        break;
    }
  };

  worker.onerror = () => {
    callbacks.onError(`Island ${String(islandId)} encountered an unexpected error`);
  };

  return {
    start(config: IslandGAConfig): void {
      const request: IslandRequest = { type: "start", config, islandId };
      worker.postMessage(request);
    },
    stop(): void {
      const request: IslandRequest = { type: "stop" };
      worker.postMessage(request);
      worker.terminate();
    },
    requestMigrants(count: number): void {
      const request: IslandRequest = { type: "requestMigrants", count };
      worker.postMessage(request);
    },
    receiveMigrants(individuals: Chromosome[]): void {
      const request: IslandRequest = { type: "receiveMigrants", individuals };
      worker.postMessage(request);
    },
  };
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
// Coordinator config
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

// ---------------------------------------------------------------------------
// IslandCoordinator class
// ---------------------------------------------------------------------------

/**
 * Worker-based island coordinator.
 *
 * This is a thin wrapper that creates a CoordinatorCore with
 * a factory that produces real Web Worker-backed island handles.
 */
export class IslandCoordinator {
  private core: CoordinatorCore | null = null;
  private workerFactory: IslandFactory = createWorkerHandle;

  start(config: IslandCoordinatorConfig, callbacks: IslandCoordinatorCallbacks): void {
    const islandCount = getIslandCount();
    this.core = new CoordinatorCore(this.workerFactory, islandCount);
    this.core.start(config, callbacks);
  }

  stop(): void {
    this.core?.stop();
    this.core = null;
  }
}
