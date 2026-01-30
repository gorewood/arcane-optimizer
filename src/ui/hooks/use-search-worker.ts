/**
 * useSearchWorker — manages Web Worker lifecycle for search execution.
 *
 * Extracted from search-panel.tsx to allow the worker to live in a
 * component that stays mounted (OptimizerPage) rather than in a tab
 * panel that unmounts on tab switch.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { buildMergedGearPool } from "@/data/merged-loaders";
import type { EquipmentPiece, GearPool, SearchResult, SoftConstraint } from "@/models/types";
import { expandEquipment } from "@/search/expand-variants";
import { DEFAULT_HARD_CONSTRAINTS } from "@/search/constraints";
import { filterPoolByGoals, formatFilterStats } from "@/search/pool-filter";
import { useFitnessStore } from "@/stores/fitness-store";
import { useGearPoolStore } from "@/stores/gear-pool-store";
import { useSearchStore, type GAParams } from "@/stores/search-store";
import { useUIStore } from "@/stores/ui-store";
import { useUserDataStore } from "@/stores/user-data-store";
import type { ExitMetadata, WorkerRequest, WorkerResponse } from "@/workers/search-worker";
import { ExhaustiveCoordinator } from "@/workers/exhaustive-coordinator";
import { IslandCoordinator } from "@/workers/island-coordinator";

// ---------------------------------------------------------------------------
// Progress state type
// ---------------------------------------------------------------------------

export interface ProgressState {
  readonly checked: number;
  readonly total: number;
  readonly bestScore: number;
  readonly startTime: number;
  readonly resultsCount: number;
  /** Filter stats for exhaustive search (null if no filtering applied). */
  readonly filterMessage: string | null;
}

export const INITIAL_PROGRESS: ProgressState = {
  checked: 0,
  total: 0,
  bestScore: 0,
  startTime: 0,
  resultsCount: 0,
  filterMessage: null,
};

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function validatePreSearch(
  equipmentCount: number,
  enchantmentCount: number,
  constraintCount: number,
): string | null {
  if (equipmentCount === 0 && enchantmentCount === 0) {
    return "No gear enabled. Configure the gear pool before searching.";
  }
  if (equipmentCount === 0) {
    return "No equipment enabled. Enable at least one piece in the gear pool.";
  }
  if (constraintCount === 0) {
    return "No fitness constraints defined. Add at least one constraint.";
  }
  return null;
}

// ---------------------------------------------------------------------------
// Gear pool builder
// ---------------------------------------------------------------------------

import type { MergedGetters, EnabledIds } from "@/data/merged-loaders";

/**
 * Build gear pool from merged user data with variant expansion.
 */
function buildFilteredGearPool(
  getters: MergedGetters,
  ids: EnabledIds,
  enabledVariants: ReadonlySet<string>,
): GearPool {
  // Build base gear pool from merged data
  const basePool = buildMergedGearPool(getters, ids);

  // Expand equipment with variants into multiple candidates
  const expandedChestplates = expandEquipment(basePool.chestplates, enabledVariants);
  const expandedLeggings = expandEquipment(basePool.leggings, enabledVariants);
  const expandedAccessories = expandEquipment(basePool.accessories, enabledVariants);

  // Filter by slot type (expansion preserves slot, so just reassign)
  const isAccessory = (e: EquipmentPiece): boolean =>
    e.slot === "accessory" ||
    e.slot === "accessory-H" ||
    e.slot === "accessory-A";

  return {
    chestplates: expandedChestplates.filter((e) => e.slot === "chestplate"),
    leggings: expandedLeggings.filter((e) => e.slot === "leggings"),
    accessories: expandedAccessories.filter(isAccessory),
    enchantments: basePool.enchantments,
    modifiers: basePool.modifiers,
    gems: basePool.gems,
  };
}

/**
 * Count total combinations for exhaustive search.
 */
function countCombinations(pool: GearPool): number {
  const n = pool.accessories.length;
  const accCombos = n >= 3 ? (n * (n - 1) * (n - 2)) / 6 : 0;
  return pool.chestplates.length * pool.leggings.length * accCombos;
}

/** Threshold above which we recommend genetic algorithm */
const LARGE_SEARCH_THRESHOLD = 1_000_000;

/**
 * Check if exhaustive search is too large and prompt user to switch.
 * Returns the algorithm to use (may switch to genetic if user agrees).
 */
function checkLargeSearchPrompt(
  algorithm: Algorithm,
  combinations: number,
  setAlgorithm: (a: Algorithm) => void,
): Algorithm {
  if (algorithm !== "exhaustive" || combinations <= LARGE_SEARCH_THRESHOLD) {
    return algorithm;
  }

  const formatted = combinations.toLocaleString();
  const shouldSwitch = window.confirm(
    `This search has ${formatted} combinations, which may take a while.\n\n` +
    `Switch to Genetic algorithm for faster results?\n\n` +
    `Click OK to switch to Genetic, or Cancel to continue with Exhaustive.`
  );

  if (shouldSwitch) {
    setAlgorithm("genetic");
    return "genetic";
  }
  return algorithm;
}

// ---------------------------------------------------------------------------
// Worker lifecycle
// ---------------------------------------------------------------------------

interface WorkerCallbacks {
  readonly onProgress: (checked: number, total: number, bestScore: number, topResults: readonly SearchResult[]) => void;
  readonly onComplete: (results: readonly SearchResult[], exitMetadata: ExitMetadata | undefined) => void;
  readonly onError: (message: string) => void;
}

function createSearchWorker(cb: WorkerCallbacks): Worker {
  const worker = new Worker(
    new URL("../../workers/search-worker.ts", import.meta.url),
    { type: "module" },
  );

  worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
    const msg = event.data;
    switch (msg.type) {
      case "progress": cb.onProgress(msg.checked, msg.total, msg.bestScore, msg.topResults); break;
      case "complete": cb.onComplete(msg.results, msg.exitMetadata); worker.terminate(); break;
      case "error": cb.onError(msg.message); worker.terminate(); break;
    }
  };

  worker.onerror = () => {
    cb.onError("Search worker encountered an unexpected error");
    worker.terminate();
  };

  return worker;
}

// ---------------------------------------------------------------------------
// Worker launch helper
// ---------------------------------------------------------------------------

export type Algorithm = "exhaustive" | "genetic";

interface LaunchConfig {
  readonly gearPool: GearPool;
  readonly fitness: readonly SoftConstraint[];
  readonly maxResults: number;
  readonly algorithm: Algorithm;
  readonly gaParams: GAParams;
}

function launchWorker(config: LaunchConfig, cb: WorkerCallbacks): Worker {
  const worker = createSearchWorker(cb);
  const request: WorkerRequest = {
    type: "start",
    gearPool: config.gearPool,
    constraints: DEFAULT_HARD_CONSTRAINTS,
    fitness: [...config.fitness],
    options: {
      maxResults: config.maxResults,
      populationSize: config.gaParams.populationSize,
      generations: config.gaParams.generations,
      mutationRate: config.gaParams.mutationRate,
    },
    algorithm: config.algorithm,
  };
  worker.postMessage(request);
  return worker;
}

// ---------------------------------------------------------------------------
// Coordinator launcher
// ---------------------------------------------------------------------------

interface CoordinatorLaunchConfig {
  readonly gearPool: GearPool;
  readonly fitness: readonly SoftConstraint[];
  readonly maxResults: number;
}

interface CoordinatorCallbacks {
  readonly onProgress: (checked: number, total: number, bestScore: number, topResults: readonly SearchResult[]) => void;
  readonly onComplete: (results: readonly SearchResult[]) => void;
  readonly onError: (message: string) => void;
}

function launchCoordinator(config: CoordinatorLaunchConfig, cb: CoordinatorCallbacks): ExhaustiveCoordinator {
  const coordinator = new ExhaustiveCoordinator();
  coordinator.start(
    {
      gearPool: config.gearPool,
      constraints: DEFAULT_HARD_CONSTRAINTS,
      fitness: config.fitness,
      maxResults: config.maxResults,
    },
    {
      onProgress: cb.onProgress,
      onComplete: cb.onComplete,
      onError: cb.onError,
    },
  );
  return coordinator;
}

// ---------------------------------------------------------------------------
// Island coordinator launcher (for GA mode)
// ---------------------------------------------------------------------------

interface IslandLaunchConfig {
  readonly gearPool: GearPool;
  readonly fitness: readonly SoftConstraint[];
  readonly maxResults: number;
  readonly gaParams: GAParams;
}

interface IslandCallbacks {
  readonly onProgress: (gen: number, total: number, bestScore: number, topResults: readonly SearchResult[]) => void;
  readonly onComplete: (results: readonly SearchResult[], exitMetadata: ExitMetadata) => void;
  readonly onError: (message: string) => void;
}

function launchIslandCoordinator(config: IslandLaunchConfig, cb: IslandCallbacks): IslandCoordinator {
  const coordinator = new IslandCoordinator();
  coordinator.start(
    {
      gearPool: config.gearPool,
      constraints: DEFAULT_HARD_CONSTRAINTS,
      fitness: config.fitness,
      maxResults: config.maxResults,
      populationSize: config.gaParams.populationSize,
      generations: config.gaParams.generations,
      mutationRate: config.gaParams.mutationRate,
      islandCount: config.gaParams.islandCount,
    },
    {
      onProgress: cb.onProgress,
      onComplete: cb.onComplete,
      onError: cb.onError,
    },
  );
  return coordinator;
}

// ---------------------------------------------------------------------------
// Hook helpers
// ---------------------------------------------------------------------------

interface SearchContext {
  readonly startSearch: () => void;
  readonly setResults: (r: readonly SearchResult[], m: ExitMetadata | undefined) => void;
  readonly setPreviewResults: (r: readonly SearchResult[]) => void;
  readonly setError: (m: string) => void;
  readonly setExpandedCards: (s: ReadonlySet<number>) => void;
  readonly setProgress: React.Dispatch<React.SetStateAction<ProgressState>>;
  readonly workerRef: React.RefObject<Worker | null>;
  readonly coordinatorRef: React.RefObject<ExhaustiveCoordinator | null>;
  readonly islandCoordinatorRef: React.RefObject<IslandCoordinator | null>;
  readonly algorithm: Algorithm;
  readonly gaParams: GAParams;
  readonly constraints: readonly SoftConstraint[];
  readonly enabledVariants: ReadonlySet<string>;
  readonly ids: EnabledIds;
  readonly getters: MergedGetters;
  readonly maxResults: number;
}

function executeSearch(ctx: SearchContext): void {
  const { startSearch, setResults, setPreviewResults, setError, setExpandedCards, setProgress, workerRef, coordinatorRef, islandCoordinatorRef, algorithm, gaParams, constraints, enabledVariants, ids, getters, maxResults } = ctx;
  const basePool = buildFilteredGearPool(getters, ids, enabledVariants);

  // For exhaustive search, filter pool to items contributing to goal stats (or with sockets)
  let gearPool = basePool;
  let filterMessage: string | null = null;
  if (algorithm === "exhaustive") {
    const { pool: filteredPool, stats } = filterPoolByGoals(basePool, constraints);
    gearPool = filteredPool;
    filterMessage = formatFilterStats(stats);
  }

  startSearch();
  setProgress({ ...INITIAL_PROGRESS, startTime: Date.now(), filterMessage });

  const onProg = (c: number, t: number, b: number, r: readonly SearchResult[]): void => {
    setProgress((p) => ({ ...p, checked: c, total: t, bestScore: b, resultsCount: r.length }));
    setPreviewResults(r);
  };
  const onComplete = (r: readonly SearchResult[], meta?: ExitMetadata): void => {
    setResults(r, meta);
    if (r.length > 0) setExpandedCards(new Set([0]));
  };

  if (algorithm === "exhaustive") {
    coordinatorRef.current = launchCoordinator(
      { gearPool, fitness: constraints, maxResults },
      { onProgress: onProg, onComplete: (r) => { onComplete(r, undefined); }, onError: setError },
    );
  } else {
    // Use island coordinator for GA mode (parallel islands with migration)
    // Fall back to single worker if only 1 core available
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- may be undefined in non-browser
    const cores = globalThis.navigator?.hardwareConcurrency ?? 1;
    if (cores <= 1) {
      workerRef.current = launchWorker(
        { gearPool, fitness: constraints, maxResults, algorithm, gaParams },
        { onProgress: onProg, onComplete, onError: setError },
      );
    } else {
      islandCoordinatorRef.current = launchIslandCoordinator(
        { gearPool, fitness: constraints, maxResults, gaParams },
        { onProgress: onProg, onComplete, onError: setError },
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export interface WorkerHookResult {
  readonly controls: { readonly start: () => void; readonly stop: () => void };
  readonly progress: ProgressState;
  readonly warning: string | null;
}

export function useSearchWorker(maxResults: number): WorkerHookResult {
  const startSearch = useSearchStore((s) => s.startSearch);
  const setResults = useSearchStore((s) => s.setResults);
  const setPreviewResults = useSearchStore((s) => s.setPreviewResults);
  const setError = useSearchStore((s) => s.setError);
  const reset = useSearchStore((s) => s.reset);
  const algorithm = useSearchStore((s) => s.algorithm);
  const setAlgorithm = useSearchStore((s) => s.setAlgorithm);
  const gaParams = useSearchStore((s) => s.gaParams);
  const constraints = useFitnessStore((s) => s.constraintsConfig.constraints);
  const enabledVariants = useFitnessStore((s) => s.enabledVariants);
  const eqIds = useGearPoolStore((s) => s.enabledEquipmentIds);
  const enIds = useGearPoolStore((s) => s.enabledEnchantmentIds);
  const modIds = useGearPoolStore((s) => s.enabledModifierIds);
  const gemIds = useGearPoolStore((s) => s.enabledGemIds);
  const setExpandedCards = useUIStore((s) => s.setExpandedCards);
  const getMergedEquipment = useUserDataStore((s) => s.getMergedEquipment);
  const getMergedEnchantments = useUserDataStore((s) => s.getMergedEnchantments);
  const getMergedModifiers = useUserDataStore((s) => s.getMergedModifiers);
  const getMergedGems = useUserDataStore((s) => s.getMergedGems);

  const [progress, setProgress] = useState<ProgressState>(INITIAL_PROGRESS);
  const [warning, setWarning] = useState<string | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const coordinatorRef = useRef<ExhaustiveCoordinator | null>(null);
  const islandCoordinatorRef = useRef<IslandCoordinator | null>(null);

  useEffect(() => {
    const wRef = workerRef;
    const cRef = coordinatorRef;
    const iRef = islandCoordinatorRef;
    return () => { wRef.current?.terminate(); cRef.current?.stop(); iRef.current?.stop(); };
  }, []);

  const start = useCallback(() => {
    const msg = validatePreSearch(eqIds.size, enIds.size, constraints.length);
    if (msg != null) { setWarning(msg); return; }
    setWarning(null);

    const ids: EnabledIds = { equipment: eqIds, enchantments: enIds, modifiers: modIds, gems: gemIds };
    const getters: MergedGetters = { getMergedEquipment, getMergedEnchantments, getMergedModifiers, getMergedGems };
    const gearPool = buildFilteredGearPool(getters, ids, enabledVariants);
    const effectiveAlgorithm = checkLargeSearchPrompt(algorithm, countCombinations(gearPool), setAlgorithm);

    const ctx: SearchContext = {
      startSearch, setResults, setPreviewResults, setError, setExpandedCards, setProgress,
      workerRef, coordinatorRef, islandCoordinatorRef,
      algorithm: effectiveAlgorithm, gaParams, constraints, enabledVariants, ids, getters, maxResults,
    };
    executeSearch(ctx);
  }, [eqIds, enIds, modIds, gemIds, constraints, enabledVariants, maxResults, algorithm, gaParams, startSearch, setResults, setPreviewResults, setError, setExpandedCards, setAlgorithm, getMergedEquipment, getMergedEnchantments, getMergedModifiers, getMergedGems]);

  const stop = useCallback(() => {
    workerRef.current?.terminate(); workerRef.current = null;
    coordinatorRef.current?.stop(); coordinatorRef.current = null;
    islandCoordinatorRef.current?.stop(); islandCoordinatorRef.current = null;
    reset();
  }, [reset]);

  return { controls: { start, stop }, progress, warning };
}
