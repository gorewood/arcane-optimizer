/**
 * SearchPanel -- manages search execution controls, progress, and results.
 *
 * Start/Stop button, max-results slider, progress bar with live stats,
 * error display, and results summary. Validates gear pool and fitness
 * configuration before launching the worker.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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

// ---------------------------------------------------------------------------
// Progress state tracked locally (not in global store)
// ---------------------------------------------------------------------------

interface ProgressState {
  readonly checked: number;
  readonly total: number;
  readonly bestScore: number;
  readonly startTime: number;
}

const INITIAL_PROGRESS: ProgressState = {
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
      case "progress":
        cb.onProgress(msg.checked, msg.total, msg.bestScore);
        break;
      case "complete":
        cb.onComplete(msg.results);
        worker.terminate();
        break;
      case "error":
        cb.onError(msg.message);
        worker.terminate();
        break;
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

interface LaunchConfig {
  readonly gearPool: GearPool;
  readonly fitness: readonly SoftConstraint[];
  readonly maxResults: number;
  readonly enhancementMode: EnhancementMode;
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
  };
  worker.postMessage(request);
  return worker;
}

// ---------------------------------------------------------------------------
// useSearchWorker hook
// ---------------------------------------------------------------------------

interface WorkerControls {
  readonly start: () => void;
  readonly stop: () => void;
}

interface WorkerHookResult {
  readonly controls: WorkerControls;
  readonly progress: ProgressState;
  readonly warning: string | null;
}

function useSearchWorker(maxResults: number, enhancementMode: EnhancementMode): WorkerHookResult {
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
      { gearPool, fitness: constraints, maxResults, enhancementMode },
      {
        onProgress: (c, t, b) => { setProgress((p) => ({ ...p, checked: c, total: t, bestScore: b })); },
        onComplete: (r) => { setResults(r); workerRef.current = null; },
        onError: (m) => { setError(m); workerRef.current = null; },
      },
    );
  }, [eqIds, enIds, modIds, gemIds, constraints, maxResults, enhancementMode, startSearch, setResults, setError]);

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
  const { controls, progress, warning } = useSearchWorker(maxResults, enhancementMode);

  const canStart = status === "idle" || status === "complete" || status === "error";

  return (
    <div className="space-y-4 p-6">
      <h2 className="text-lg font-bold text-text-primary">Search Controls</h2>

      <MaxResultsSlider value={maxResults} onChange={setMaxResults} />
      <EnhancementModeSelect value={enhancementMode} onChange={setEnhancementMode} />
      <Separator className="bg-border-subtle" />

      <SearchButton
        canStart={canStart}
        isRunning={status === "running"}
        onStart={controls.start}
        onStop={controls.stop}
      />

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
        <span className="text-sm font-semibold text-accent-gold">
          Max Results
        </span>
        <span className="text-sm font-stat text-text-primary">
          {String(value)}
        </span>
      </div>
      <Slider
        min={5}
        max={50}
        step={5}
        value={[value]}
        onValueChange={(vals) => {
          const first = vals[0];
          if (first !== undefined) onChange(first);
        }}
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
      <span className="text-sm font-semibold text-accent-gold">
        Enhancement Mode
      </span>
      <div className="flex gap-2">
        {(["none", "greedy", "budget-aware"] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${
              value === mode
                ? "border-accent-gold bg-accent-gold/10 text-accent-gold font-semibold"
                : "border-border-default text-text-secondary hover:border-text-muted"
            }`}
            onClick={() => { onChange(mode); }}
          >
            {ENHANCEMENT_MODE_LABELS[mode]}
          </button>
        ))}
      </div>
    </div>
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

// ---------------------------------------------------------------------------
// WarningMessage
// ---------------------------------------------------------------------------

function WarningMessage({ message }: { readonly message: string }): React.JSX.Element {
  return (
    <Card className="border-stat-warning/40 bg-stat-warning/5 p-4">
      <p className="text-sm text-stat-warning">{message}</p>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// ProgressDisplay — uses interval for elapsed time to avoid impure render
// ---------------------------------------------------------------------------

function ProgressDisplay({
  progress,
}: {
  readonly progress: ProgressState;
}): React.JSX.Element {
  const { checked, total, bestScore, startTime } = progress;
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setElapsed((Date.now() - startTime) / 1000);
    }, 200);
    return () => { clearInterval(id); };
  }, [startTime]);

  const pct = total > 0 ? Math.min((checked / total) * 100, 100) : 0;

  return (
    <div className="space-y-3">
      <div className="stat-bar">
        <div
          className="stat-bar-fill bg-accent-gold"
          style={{ width: `${String(pct)}%` }}
        />
      </div>
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <ProgressStat label="Checked" value={`${String(checked)} / ${String(total)}`} />
        <ProgressStat label="Elapsed" value={`${elapsed.toFixed(1)}s`} />
        <ProgressStat label="Best Score" value={bestScore.toFixed(1)} />
      </div>
    </div>
  );
}

function ProgressStat({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string;
}): React.JSX.Element {
  return (
    <div>
      <p className="text-text-muted">{label}</p>
      <p className="font-stat text-text-primary">{value}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ErrorDisplay
// ---------------------------------------------------------------------------

function ErrorDisplay({ message }: { readonly message: string }): React.JSX.Element {
  return (
    <Card className="border-stat-negative/40 bg-stat-negative/5 p-4 space-y-2">
      <p className="text-sm font-semibold text-stat-negative">Search Error</p>
      <p className="text-sm text-text-secondary">{message}</p>
      <p className="text-xs text-text-muted">
        Try relaxing constraints or expanding the gear pool
      </p>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// ResultsSummary
// ---------------------------------------------------------------------------

function ResultsSummary({
  results,
}: {
  readonly results: readonly SearchResult[];
}): React.JSX.Element {
  const bestScore = results.length > 0 ? results[0]?.score ?? 0 : 0;

  return (
    <Card className="border-stat-positive/40 bg-stat-positive/5 p-4 space-y-1">
      <p className="text-sm font-semibold text-stat-positive">Search Complete</p>
      <p className="text-sm text-text-secondary">
        Found{" "}
        <span className="font-stat text-text-primary">{String(results.length)}</span>
        {" "}result{results.length !== 1 ? "s" : ""}
      </p>
      {results.length > 0 && (
        <p className="text-sm text-text-secondary">
          Best score:{" "}
          <span className="font-stat text-accent-gold">{bestScore.toFixed(1)}</span>
        </p>
      )}
    </Card>
  );
}
