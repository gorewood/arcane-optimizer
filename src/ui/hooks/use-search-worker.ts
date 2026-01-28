/**
 * useSearchWorker — manages Web Worker lifecycle for search execution.
 *
 * Extracted from search-panel.tsx to allow the worker to live in a
 * component that stays mounted (OptimizerPage) rather than in a tab
 * panel that unmounts on tab switch.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  loadEquipment,
  loadEnchantments,
  loadModifiers,
  loadGems,
} from "@/data/loaders";
import type { EnhancementMode, GearPool, SearchResult, SoftConstraint } from "@/models/types";
import { DEFAULT_HARD_CONSTRAINTS } from "@/search/constraints";
import { useFitnessStore } from "@/stores/fitness-store";
import { useGearPoolStore } from "@/stores/gear-pool-store";
import { useSearchStore } from "@/stores/search-store";
import type { WorkerRequest, WorkerResponse } from "@/workers/search-worker";

// ---------------------------------------------------------------------------
// Progress state type
// ---------------------------------------------------------------------------

export interface ProgressState {
  readonly checked: number;
  readonly total: number;
  readonly bestScore: number;
  readonly startTime: number;
}

export const INITIAL_PROGRESS: ProgressState = {
  checked: 0,
  total: 0,
  bestScore: 0,
  startTime: 0,
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

interface EnabledIds {
  readonly equipment: ReadonlySet<string>;
  readonly enchantments: ReadonlySet<string>;
  readonly modifiers: ReadonlySet<string>;
  readonly gems: ReadonlySet<string>;
}

function buildFilteredGearPool(ids: EnabledIds): GearPool {
  const allEquipment = loadEquipment();
  const enabled = allEquipment.filter((e) => ids.equipment.has(e.id));

  return {
    chestplates: enabled.filter((e) => e.slot === "chestplate"),
    leggings: enabled.filter((e) => e.slot === "leggings"),
    accessories: enabled.filter(
      (e) =>
        e.slot === "accessory" ||
        e.slot === "accessory-H" ||
        e.slot === "accessory-A",
    ),
    enchantments: loadEnchantments().filter((e) => ids.enchantments.has(e.id)),
    modifiers: loadModifiers().filter((m) => ids.modifiers.has(m.id)),
    gems: loadGems().filter((g) => ids.gems.has(g.id)),
  };
}

// ---------------------------------------------------------------------------
// Worker lifecycle
// ---------------------------------------------------------------------------

interface WorkerCallbacks {
  readonly onProgress: (checked: number, total: number, bestScore: number) => void;
  readonly onComplete: (results: readonly SearchResult[]) => void;
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
      case "progress": cb.onProgress(msg.checked, msg.total, msg.bestScore); break;
      case "complete": cb.onComplete(msg.results); worker.terminate(); break;
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
  readonly enhancementMode: EnhancementMode;
  readonly algorithm: Algorithm;
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
      enhancementMode: config.enhancementMode,
    },
    algorithm: config.algorithm,
  };
  worker.postMessage(request);
  return worker;
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
  const setError = useSearchStore((s) => s.setError);
  const reset = useSearchStore((s) => s.reset);
  const enhancementMode = useSearchStore((s) => s.enhancementMode);
  const algorithm = useSearchStore((s) => s.algorithm);
  const constraints = useFitnessStore((s) => s.constraints);

  const eqIds = useGearPoolStore((s) => s.enabledEquipmentIds);
  const enIds = useGearPoolStore((s) => s.enabledEnchantmentIds);
  const modIds = useGearPoolStore((s) => s.enabledModifierIds);
  const gemIds = useGearPoolStore((s) => s.enabledGemIds);

  const [progress, setProgress] = useState<ProgressState>(INITIAL_PROGRESS);
  const [warning, setWarning] = useState<string | null>(null);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    const ref = workerRef;
    return () => { ref.current?.terminate(); };
  }, []);

  const start = useCallback(() => {
    const msg = validatePreSearch(eqIds.size, enIds.size, constraints.length);
    if (msg != null) { setWarning(msg); return; }
    setWarning(null);

    const ids: EnabledIds = { equipment: eqIds, enchantments: enIds, modifiers: modIds, gems: gemIds };
    const gearPool = buildFilteredGearPool(ids);
    startSearch();
    setProgress({ ...INITIAL_PROGRESS, startTime: Date.now() });

    workerRef.current = launchWorker(
      { gearPool, fitness: constraints, maxResults, enhancementMode, algorithm },
      {
        onProgress: (c, t, b) => { setProgress((p) => ({ ...p, checked: c, total: t, bestScore: b })); },
        onComplete: (r) => { setResults(r); workerRef.current = null; },
        onError: (m) => { setError(m); workerRef.current = null; },
      },
    );
  }, [eqIds, enIds, modIds, gemIds, constraints, maxResults, enhancementMode, algorithm, startSearch, setResults, setError]);

  const stop = useCallback(() => {
    const w = workerRef.current;
    if (w != null) {
      const stopMsg: WorkerRequest = { type: "stop" };
      w.postMessage(stopMsg);
      w.terminate();
      workerRef.current = null;
    }
    reset();
  }, [reset]);

  return { controls: { start, stop }, progress, warning };
}
