/**
 * Web Worker for running ExhaustiveSearch off the main thread.
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
    }
  | { readonly type: "stop" };

/** Messages this worker sends back to the main thread. */
export type WorkerResponse =
  | {
      readonly type: "progress";
      readonly checked: number;
      readonly total: number;
      readonly bestScore: number;
    }
  | {
      readonly type: "complete";
      readonly results: readonly SearchResult[];
    }
  | {
      readonly type: "error";
      readonly message: string;
    };

// ---------------------------------------------------------------------------
// Worker implementation
// ---------------------------------------------------------------------------

let activeSearch: ExhaustiveSearch | null = null;

function handleStart(msg: WorkerRequest & { type: "start" }): void {
  activeSearch = new ExhaustiveSearch();

  activeSearch.onProgress = (checked, total, bestScore) => {
    const response: WorkerResponse = {
      type: "progress",
      checked,
      total,
      bestScore,
    };
    postMessage(response);
  };

  activeSearch
    .search(msg.gearPool, msg.constraints, msg.fitness, msg.options)
    .then((results) => {
      const response: WorkerResponse = { type: "complete", results };
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
