/**
 * Island Worker — single GA island with migration protocol support.
 *
 * Loaded via Vite's worker pattern. Runs a GeneticSearch instance and
 * communicates with the IslandCoordinator for migration.
 *
 * Protocol:
 *   Incoming: IslandRequest  ("start" | "stop" | "requestMigrants" | "receiveMigrants")
 *   Outgoing: IslandResponse ("progress" | "stagnating" | "migrants" | "complete" | "error")
 */

import type {
  GearPool,
  HardConstraints,
  SearchOptions,
  SearchResult,
  SoftConstraint,
} from "@/models/types";

import type { Chromosome } from "@/search/genetic-core";
import { GeneticSearch, type GAExitReason } from "@/search/genetic-core";

// ---------------------------------------------------------------------------
// Message protocol types
// ---------------------------------------------------------------------------

/** GA configuration passed from coordinator */
export interface IslandGAConfig {
  readonly gearPool: GearPool;
  readonly constraints: HardConstraints;
  readonly fitness: SoftConstraint[];
  readonly options: SearchOptions;
}

/** Messages the coordinator sends to this island worker */
export type IslandRequest =
  | { readonly type: "start"; readonly config: IslandGAConfig; readonly islandId: number }
  | { readonly type: "stop" }
  | { readonly type: "requestMigrants"; readonly count: number }
  | { readonly type: "receiveMigrants"; readonly individuals: Chromosome[] };

/** Messages this island worker sends back to the coordinator */
export type IslandResponse =
  | { readonly type: "progress"; readonly islandId: number; readonly generation: number; readonly bestScore: number; readonly topResults: readonly SearchResult[] }
  | { readonly type: "stagnating"; readonly islandId: number }
  | { readonly type: "migrants"; readonly islandId: number; readonly individuals: Chromosome[] }
  | { readonly type: "complete"; readonly islandId: number; readonly results: readonly SearchResult[]; readonly exitReason: GAExitReason; readonly finalGeneration: number }
  | { readonly type: "error"; readonly islandId: number; readonly message: string };

// ---------------------------------------------------------------------------
// Worker state
// ---------------------------------------------------------------------------

let activeSearch: GeneticSearch | null = null;
let currentIslandId = 0;

// ---------------------------------------------------------------------------
// Message handlers
// ---------------------------------------------------------------------------

function handleStart(msg: IslandRequest & { type: "start" }): void {
  currentIslandId = msg.islandId;
  activeSearch = new GeneticSearch();

  // Hook into progress updates
  activeSearch.onProgress = (checked, _total, bestScore, topResults) => {
    const response: IslandResponse = {
      type: "progress",
      islandId: currentIslandId,
      generation: checked,
      bestScore,
      topResults,
    };
    postMessage(response);
  };

  // Hook into stagnation events
  activeSearch.onStagnating = () => {
    const response: IslandResponse = {
      type: "stagnating",
      islandId: currentIslandId,
    };
    postMessage(response);
  };

  // Run the search
  const { gearPool, constraints, fitness, options } = msg.config;
  activeSearch
    .search(gearPool, constraints, fitness, options)
    .then((results) => {
      const response: IslandResponse = {
        type: "complete",
        islandId: currentIslandId,
        results,
        exitReason: activeSearch?.exitReason ?? "complete",
        finalGeneration: activeSearch?.finalGeneration ?? 0,
      };
      postMessage(response);
      activeSearch = null;
    })
    .catch((err: unknown) => {
      const message = err instanceof Error ? err.message : "Unknown island worker error";
      const response: IslandResponse = {
        type: "error",
        islandId: currentIslandId,
        message,
      };
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

function handleRequestMigrants(msg: IslandRequest & { type: "requestMigrants" }): void {
  if (activeSearch == null) return;

  const individuals = activeSearch.exportTopN(msg.count);
  const response: IslandResponse = {
    type: "migrants",
    islandId: currentIslandId,
    individuals,
  };
  postMessage(response);
}

function handleReceiveMigrants(msg: IslandRequest & { type: "receiveMigrants" }): void {
  if (activeSearch == null) return;
  activeSearch.receiveMigrants(msg.individuals);
}

// ---------------------------------------------------------------------------
// Worker entry point
// ---------------------------------------------------------------------------

self.onmessage = (event: MessageEvent<IslandRequest>): void => {
  const msg = event.data;
  switch (msg.type) {
    case "start":
      handleStart(msg);
      break;
    case "stop":
      handleStop();
      break;
    case "requestMigrants":
      handleRequestMigrants(msg);
      break;
    case "receiveMigrants":
      handleReceiveMigrants(msg);
      break;
  }
};
