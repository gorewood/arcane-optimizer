/**
 * Island Worker — thin Worker shell that routes messages to IslandCore.
 *
 * Protocol:
 *   Incoming: IslandRequest  ("start" | "stop" | "requestMigrants" | "receiveMigrants")
 *   Outgoing: IslandResponse ("progress" | "stagnating" | "migrants" | "complete" | "error")
 */

import type { SearchResult } from "@/models/types";
import type { Chromosome, GAExitReason } from "@/search/genetic-core";
import type { IslandGAConfig } from "@/search/island-core";
import { IslandCore } from "@/search/island-core";

// ---------------------------------------------------------------------------
// Message protocol types (re-exported for coordinator)
// ---------------------------------------------------------------------------

export type { IslandGAConfig } from "@/search/island-core";

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

let island: IslandCore | null = null;
let currentIslandId = 0;

// ---------------------------------------------------------------------------
// Message handlers
// ---------------------------------------------------------------------------

function handleStart(msg: IslandRequest & { type: "start" }): void {
  currentIslandId = msg.islandId;
  island = new IslandCore(msg.islandId, {
    onProgress: (generation, bestScore, topResults) => {
      postMessage({ type: "progress", islandId: currentIslandId, generation, bestScore, topResults } satisfies IslandResponse);
    },
    onStagnating: () => {
      postMessage({ type: "stagnating", islandId: currentIslandId } satisfies IslandResponse);
    },
    onMigrants: (individuals) => {
      postMessage({ type: "migrants", islandId: currentIslandId, individuals } satisfies IslandResponse);
    },
    onComplete: (results, exitReason, finalGeneration) => {
      postMessage({ type: "complete", islandId: currentIslandId, results, exitReason, finalGeneration } satisfies IslandResponse);
      island = null;
    },
    onError: (message) => {
      postMessage({ type: "error", islandId: currentIslandId, message } satisfies IslandResponse);
      island = null;
    },
  });
  island.start(msg.config);
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
      island?.stop();
      island = null;
      break;
    case "requestMigrants":
      island?.requestMigrants(msg.count);
      break;
    case "receiveMigrants":
      island?.receiveMigrants(msg.individuals);
      break;
  }
};
