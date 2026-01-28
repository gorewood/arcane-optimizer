/**
 * Parallel exhaustive search worker — processes a partition of chestplates.
 *
 * Receives assigned chestplate indices and runs exhaustive search over
 * those chestplates × all leggings × all accessory combinations.
 */

import type {
  EquipmentPiece,
  GearPool,
  HardConstraints,
  SearchResult,
  SoftConstraint,
} from "@/models/types";

import { ExhaustiveSearch } from "@/search/exhaustive";
import type { EnhancementMode } from "@/search/enhance";

// ---------------------------------------------------------------------------
// Message protocol
// ---------------------------------------------------------------------------

export interface PartitionedSearchRequest {
  readonly type: "start";
  readonly workerId: number;
  readonly gearPool: GearPool;
  readonly assignedChestIndices: readonly number[];
  readonly constraints: HardConstraints;
  readonly fitness: readonly SoftConstraint[];
  readonly maxResults: number;
  readonly enhancementMode: EnhancementMode;
}

export type ExhaustiveWorkerRequest =
  | PartitionedSearchRequest
  | { readonly type: "stop" };

export type ExhaustiveWorkerResponse =
  | {
      readonly type: "progress";
      readonly workerId: number;
      readonly checked: number;
      readonly total: number;
      readonly bestScore: number;
      readonly topResults: readonly SearchResult[];
    }
  | {
      readonly type: "complete";
      readonly workerId: number;
      readonly results: readonly SearchResult[];
    }
  | {
      readonly type: "error";
      readonly workerId: number;
      readonly message: string;
    };

// ---------------------------------------------------------------------------
// Partitioned search implementation
// ---------------------------------------------------------------------------

interface PartitionConfig {
  readonly gearPool: GearPool;
  readonly assignedChests: readonly EquipmentPiece[];
  readonly constraints: HardConstraints;
  readonly fitness: readonly SoftConstraint[];
  readonly maxResults: number;
  readonly enhancementMode: EnhancementMode;
}

function countPartitionCombinations(
  assignedChests: readonly EquipmentPiece[],
  leggings: readonly EquipmentPiece[],
  accessories: readonly EquipmentPiece[],
): number {
  const n = accessories.length;
  const accCombos = n >= 3 ? (n * (n - 1) * (n - 2)) / 6 : 0;
  return assignedChests.length * leggings.length * accCombos;
}

let cancelled = false;

async function runPartitionedSearch(
  config: PartitionConfig,
  workerId: number,
): Promise<readonly SearchResult[]> {
  const { gearPool, assignedChests, constraints, fitness, maxResults, enhancementMode } = config;

  // Use existing ExhaustiveSearch logic via a modified gear pool
  const partitionedPool: GearPool = {
    ...gearPool,
    chestplates: [...assignedChests],
  };

  const search = new ExhaustiveSearch();
  const total = countPartitionCombinations(assignedChests, gearPool.leggings, gearPool.accessories);

  search.onProgress = (checked, _total, bestScore, topResults) => {
    const response: ExhaustiveWorkerResponse = {
      type: "progress",
      workerId,
      checked,
      total,
      bestScore,
      topResults,
    };
    postMessage(response);
  };

  // Check cancellation
  if (cancelled) {
    return [];
  }

  const results = await search.search(partitionedPool, constraints, fitness, {
    maxResults,
    enhancementMode,
  });

  return results;
}

// ---------------------------------------------------------------------------
// Worker message handler
// ---------------------------------------------------------------------------

function handleStart(msg: PartitionedSearchRequest): void {
  cancelled = false;

  const assignedChests = msg.assignedChestIndices
    .map((i) => msg.gearPool.chestplates[i])
    .filter((c): c is EquipmentPiece => c != null);

  runPartitionedSearch(
    {
      gearPool: msg.gearPool,
      assignedChests,
      constraints: msg.constraints,
      fitness: msg.fitness,
      maxResults: msg.maxResults,
      enhancementMode: msg.enhancementMode,
    },
    msg.workerId,
  )
    .then((results) => {
      const response: ExhaustiveWorkerResponse = {
        type: "complete",
        workerId: msg.workerId,
        results,
      };
      postMessage(response);
    })
    .catch((err: unknown) => {
      const message = err instanceof Error ? err.message : "Unknown worker error";
      const response: ExhaustiveWorkerResponse = {
        type: "error",
        workerId: msg.workerId,
        message,
      };
      postMessage(response);
    });
}

self.onmessage = (event: MessageEvent<ExhaustiveWorkerRequest>): void => {
  const msg = event.data;
  if (msg.type === "start") {
    handleStart(msg);
  } else {
    cancelled = true;
  }
};
