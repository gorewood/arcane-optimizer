/**
 * SearchPanel -- manages search execution controls, progress, and results.
 *
 * Start/Stop button, max-results slider, progress bar with live stats,
 * error display, and results summary. Validates gear pool and fitness
 * configuration before launching the worker.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
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
import {
  ErrorDisplay,
  INITIAL_PROGRESS,
  ProgressDisplay,
  ResultsSummary,
  WarningMessage,
} from "./search-feedback";
import type { ProgressState } from "./search-feedback";

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

type Algorithm = "exhaustive" | "genetic";

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
// useSearchWorker hook
// ---------------------------------------------------------------------------

interface WorkerHookResult {
  readonly controls: { readonly start: () => void; readonly stop: () => void };
  readonly progress: ProgressState;
  readonly warning: string | null;
}

function useSearchWorker(
  maxResults: number,
  enhancementMode: EnhancementMode,
  algorithm: Algorithm,
): WorkerHookResult {
  const startSearch = useSearchStore((s) => s.startSearch);
  const setResults = useSearchStore((s) => s.setResults);
  const setError = useSearchStore((s) => s.setError);
  const reset = useSearchStore((s) => s.reset);
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

// ---------------------------------------------------------------------------
// SearchPanel
// ---------------------------------------------------------------------------

export function SearchPanel(): React.JSX.Element {
  const status = useSearchStore((s) => s.status);
  const results = useSearchStore((s) => s.results);
  const error = useSearchStore((s) => s.error);

  const [maxResults, setMaxResults] = useState(10);
  const [enhancementMode, setEnhancementMode] = useState<EnhancementMode>("greedy");
  const [algorithm, setAlgorithm] = useState<Algorithm>("exhaustive");
  const { controls, progress, warning } = useSearchWorker(maxResults, enhancementMode, algorithm);

  const canStart = status === "idle" || status === "complete" || status === "error";

  return (
    <div className="space-y-4 p-6">
      <h2 className="text-lg font-bold text-text-primary">Search Controls</h2>
      <MaxResultsSlider value={maxResults} onChange={setMaxResults} />
      <EnhancementModeSelect value={enhancementMode} onChange={setEnhancementMode} />
      <AlgorithmSelect value={algorithm} onChange={setAlgorithm} />
      <Separator className="bg-border-subtle" />
      <SearchButton canStart={canStart} isRunning={status === "running"} onStart={controls.start} onStop={controls.stop} />
      {warning != null && <WarningMessage message={warning} />}
      {status === "running" && <ProgressDisplay progress={progress} />}
      {status === "error" && error != null && <ErrorDisplay message={error} />}
      {status === "complete" && <ResultsSummary results={results} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// MaxResultsSlider
// ---------------------------------------------------------------------------

function MaxResultsSlider({
  value,
  onChange,
}: {
  readonly value: number;
  readonly onChange: (v: number) => void;
}): React.JSX.Element {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-accent-gold">Max Results</span>
        <span className="text-sm font-stat text-text-primary">{String(value)}</span>
      </div>
      <Slider
        min={5} max={50} step={5} value={[value]}
        onValueChange={(vals) => { const first = vals[0]; if (first !== undefined) onChange(first); }}
      />
      <div className="flex justify-between text-xs text-text-muted">
        <span>5</span>
        <span>50</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// EnhancementModeSelect
// ---------------------------------------------------------------------------

const ENHANCEMENT_MODE_LABELS: Record<EnhancementMode, string> = {
  none: "None (bare equipment)",
  greedy: "Greedy (recommended)",
  "budget-aware": "Budget-Aware",
};

function EnhancementModeSelect({
  value,
  onChange,
}: {
  readonly value: EnhancementMode;
  readonly onChange: (v: EnhancementMode) => void;
}): React.JSX.Element {
  return (
    <div className="space-y-2">
      <span className="text-sm font-semibold text-accent-gold">Enhancement Mode</span>
      <div className="flex gap-2">
        {(["none", "greedy", "budget-aware"] as const).map((mode) => (
          <OptionButton key={mode} selected={value === mode} onClick={() => { onChange(mode); }}>
            {ENHANCEMENT_MODE_LABELS[mode]}
          </OptionButton>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AlgorithmSelect
// ---------------------------------------------------------------------------

const ALGORITHM_LABELS: Record<Algorithm, string> = {
  exhaustive: "Exhaustive (recommended)",
  genetic: "Genetic Algorithm",
};

function AlgorithmSelect({
  value,
  onChange,
}: {
  readonly value: Algorithm;
  readonly onChange: (v: Algorithm) => void;
}): React.JSX.Element {
  return (
    <div className="space-y-2">
      <span className="text-sm font-semibold text-accent-gold">Algorithm</span>
      <div className="flex gap-2">
        {(["exhaustive", "genetic"] as const).map((algo) => (
          <OptionButton key={algo} selected={value === algo} onClick={() => { onChange(algo); }}>
            {ALGORITHM_LABELS[algo]}
          </OptionButton>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared option button
// ---------------------------------------------------------------------------

function OptionButton({
  selected,
  onClick,
  children,
}: {
  readonly selected: boolean;
  readonly onClick: () => void;
  readonly children: React.ReactNode;
}): React.JSX.Element {
  return (
    <button
      type="button"
      className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${
        selected
          ? "border-accent-gold bg-accent-gold/10 text-accent-gold font-semibold"
          : "border-border-default text-text-secondary hover:border-text-muted"
      }`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// SearchButton
// ---------------------------------------------------------------------------

function SearchButton({
  canStart,
  isRunning,
  onStart,
  onStop,
}: {
  readonly canStart: boolean;
  readonly isRunning: boolean;
  readonly onStart: () => void;
  readonly onStop: () => void;
}): React.JSX.Element {
  if (isRunning) {
    return (
      <Button variant="destructive" className="w-full" onClick={onStop}>
        Stop Search
      </Button>
    );
  }
  return (
    <Button variant="default" className="w-full" disabled={!canStart} onClick={onStart}>
      Start Search
    </Button>
  );
}
