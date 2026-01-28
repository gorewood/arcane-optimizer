/**
 * Web Worker for running search strategies off the main thread.
 *
 * Loaded via Vite's worker pattern:
 *   new Worker(new URL('./workers/search-worker.ts', import.meta.url), { type: 'module' })
 *
 * Protocol:
 *   Incoming: WorkerRequest  ("start" | "stop")
 *   Outgoing: WorkerResponse ("progress" | "complete" | "error")
 */

import type {
  GearPool,
  HardConstraints,
  SearchOptions,
  SearchResult,
  SoftConstraint,
} from "@/models/types";

import { ExhaustiveSearch } from "@/search/exhaustive";
import { GeneticSearch } from "@/search/genetic";

// ---------------------------------------------------------------------------
// Message protocol types
// ---------------------------------------------------------------------------

/** Messages the main thread sends to this worker. */
export type WorkerRequest =
  | {
      readonly type: "start";
      readonly gearPool: GearPool;
      readonly constraints: HardConstraints;
      readonly fitness: SoftConstraint[];
      readonly options: SearchOptions;
      readonly algorithm?: "exhaustive" | "genetic" | undefined;
    }
  | { readonly type: "stop" };

/** Exit reason metadata for search completion */
export interface ExitMetadata {
  readonly reason: "complete" | "stagnation" | "cancelled" | "timeout";
  readonly finalGeneration?: number;
  readonly totalGenerations?: number;
}

/** Messages this worker sends back to the main thread. */
export type WorkerResponse =
  | {
      readonly type: "progress";
      readonly checked: number;
      readonly total: number;
      readonly bestScore: number;
      readonly topResults: readonly SearchResult[];
    }
  | {
      readonly type: "complete";
      readonly results: readonly SearchResult[];
      readonly exitMetadata: ExitMetadata | undefined;
    }
  | {
      readonly type: "error";
      readonly message: string;
    };

// ---------------------------------------------------------------------------
// Worker implementation
// ---------------------------------------------------------------------------

let activeSearch: ExhaustiveSearch | GeneticSearch | null = null;

function handleStart(msg: WorkerRequest & { type: "start" }): void {
  const algorithm = msg.algorithm ?? "exhaustive";

  if (algorithm === "genetic") {
    activeSearch = new GeneticSearch();
  } else {
    activeSearch = new ExhaustiveSearch();
  }

  activeSearch.onProgress = (checked, total, bestScore, topResults) => {
    const response: WorkerResponse = {
      type: "progress",
      checked,
      total,
      bestScore,
      topResults,
    };
    postMessage(response);
  };

  activeSearch
    .search(msg.gearPool, msg.constraints, msg.fitness, msg.options)
    .then((results) => {
      // Include exit metadata for genetic search
      let exitMetadata: ExitMetadata | undefined;
      if (activeSearch instanceof GeneticSearch) {
        exitMetadata = {
          reason: activeSearch.exitReason,
          finalGeneration: activeSearch.finalGeneration,
          totalGenerations: activeSearch.totalGenerations,
        };
      }
      const response: WorkerResponse = { type: "complete", results, exitMetadata };
      postMessage(response);
      activeSearch = null;
    })
    .catch((err: unknown) => {
      const message =
        err instanceof Error ? err.message : "Unknown worker error";
      const response: WorkerResponse = { type: "error", message };
      postMessage(response);
      activeSearch = null;
    });
}

function handleStop(): void {
  if (activeSearch != null) {
    activeSearch.cancel();
    activeSearch = null;
  }
}

self.onmessage = (event: MessageEvent<WorkerRequest>): void => {
  const msg = event.data;
  if (msg.type === "start") {
    handleStart(msg);
  } else {
    handleStop();
  }
};
