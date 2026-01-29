/**
 * SearchBar — dense search controls with GA parameter tuning.
 *
 * Compact bar with algorithm toggle, max results, and GA params
 * (visible when genetic selected). Progress strip appears below.
 */

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSearchStore, type Algorithm, type GAParams } from "@/stores/search-store";
import type { ProgressState } from "@/ui/hooks/use-search-worker";
import { WarningMessage, SearchStatusBar, ErrorDisplay } from "./search-feedback";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SearchBarProps {
  readonly onStart: () => void;
  readonly onStop: () => void;
  readonly progress: ProgressState;
  readonly warning: string | null;
  readonly maxResults: number;
  readonly onMaxResultsChange: (v: number) => void;
}

// ---------------------------------------------------------------------------
// SearchBar
// ---------------------------------------------------------------------------

export function SearchBar({
  onStart,
  onStop,
  progress,
  warning,
  maxResults,
  onMaxResultsChange,
}: SearchBarProps): React.JSX.Element {
  const status = useSearchStore((s) => s.status);
  const algorithm = useSearchStore((s) => s.algorithm);
  const gaParams = useSearchStore((s) => s.gaParams);
  const setAlgorithm = useSearchStore((s) => s.setAlgorithm);
  const setGAParams = useSearchStore((s) => s.setGAParams);
  const error = useSearchStore((s) => s.error);
  const results = useSearchStore((s) => s.results);
  const exitMetadata = useSearchStore((s) => s.exitMetadata);

  const isRunning = status === "running";
  const canStart = status === "idle" || status === "complete" || status === "error";
  const showGAParams = algorithm === "genetic";

  return (
    <div className="space-y-2">
      {/* Main controls row */}
      <div className="flex items-center gap-2 flex-wrap">
        <AlgorithmToggle value={algorithm} onChange={setAlgorithm} disabled={isRunning} />
        <MaxResultsSelect value={maxResults} onChange={onMaxResultsChange} disabled={isRunning} />
        <div className="flex-1" />
        <SearchButton isRunning={isRunning} canStart={canStart} onStart={onStart} onStop={onStop} />
      </div>

      {/* GA params row (only when genetic selected) */}
      {showGAParams && (
        <GAParamsRow params={gaParams} onChange={setGAParams} disabled={isRunning} />
      )}

      {/* Feedback area */}
      {warning != null && <WarningMessage message={warning} />}
      {(isRunning || status === "complete") && (
        <SearchStatusBar
          isRunning={isRunning}
          isComplete={status === "complete"}
          progress={progress}
          results={results}
          exitMetadata={exitMetadata}
        />
      )}
      {status === "error" && error != null && <ErrorDisplay message={error} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// AlgorithmToggle
// ---------------------------------------------------------------------------

function AlgorithmToggle({
  value,
  onChange,
  disabled,
}: {
  readonly value: Algorithm;
  readonly onChange: (v: Algorithm) => void;
  readonly disabled: boolean;
}): React.JSX.Element {
  return (
    <div className="flex rounded-md border border-border-default overflow-hidden">
      <ToggleOption label="Exhaustive" selected={value === "exhaustive"} onClick={() => { onChange("exhaustive"); }} disabled={disabled} />
      <ToggleOption label="Genetic" selected={value === "genetic"} onClick={() => { onChange("genetic"); }} disabled={disabled} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// ToggleOption
// ---------------------------------------------------------------------------

function ToggleOption({
  label,
  selected,
  onClick,
  disabled,
}: {
  readonly label: string;
  readonly selected: boolean;
  readonly onClick: () => void;
  readonly disabled: boolean;
}): React.JSX.Element {
  return (
    <button
      type="button"
      disabled={disabled}
      className={`px-3 h-7 text-xs transition-colors ${
        selected
          ? "bg-accent-gold/20 text-accent-gold font-semibold"
          : "text-text-secondary hover:bg-bg-elevated disabled:opacity-50"
      }`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// MaxResultsSelect
// ---------------------------------------------------------------------------

const MAX_RESULTS_OPTIONS = [5, 10, 15, 20, 30, 50] as const;

function MaxResultsSelect({
  value,
  onChange,
  disabled,
}: {
  readonly value: number;
  readonly onChange: (v: number) => void;
  readonly disabled: boolean;
}): React.JSX.Element {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-text-muted">Max:</span>
      <Select value={String(value)} onValueChange={(v) => { onChange(Number(v)); }} disabled={disabled}>
        <SelectTrigger className="h-7 w-16 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {MAX_RESULTS_OPTIONS.map((n) => (
            <SelectItem key={n} value={String(n)}>{n}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// ---------------------------------------------------------------------------
// GAParamsRow — genetic algorithm parameter controls
// ---------------------------------------------------------------------------

function GAParamsRow({
  params,
  onChange,
  disabled,
}: {
  readonly params: GAParams;
  readonly onChange: (p: Partial<GAParams>) => void;
  readonly disabled: boolean;
}): React.JSX.Element {
  return (
    <div className="flex items-center gap-3 flex-wrap text-xs">
      <span className="text-text-muted">GA:</span>
      <ParamInput
        label="Pop"
        value={params.populationSize}
        onChange={(v) => { onChange({ populationSize: v }); }}
        min={50}
        max={500}
        step={50}
        disabled={disabled}
      />
      <ParamInput
        label="Gens"
        value={params.generations}
        onChange={(v) => { onChange({ generations: v }); }}
        min={100}
        max={5000}
        step={100}
        disabled={disabled}
      />
      <ParamInput
        label="Mut%"
        value={Math.round(params.mutationRate * 100)}
        onChange={(v) => { onChange({ mutationRate: v / 100 }); }}
        min={5}
        max={50}
        step={5}
        disabled={disabled}
      />
    </div>
  );
}

function ParamInput({
  label,
  value,
  onChange,
  min,
  max,
  step,
  disabled,
}: {
  readonly label: string;
  readonly value: number;
  readonly onChange: (v: number) => void;
  readonly min: number;
  readonly max: number;
  readonly step: number;
  readonly disabled: boolean;
}): React.JSX.Element {
  return (
    <div className="flex items-center gap-1">
      <span className="text-text-muted">{label}:</span>
      <Input
        type="number"
        value={value}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (!Number.isNaN(v) && v >= min && v <= max) {
            onChange(v);
          }
        }}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        className="h-6 w-16 text-xs px-1.5"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// SearchButton
// ---------------------------------------------------------------------------

function SearchButton({
  isRunning,
  canStart,
  onStart,
  onStop,
}: {
  readonly isRunning: boolean;
  readonly canStart: boolean;
  readonly onStart: () => void;
  readonly onStop: () => void;
}): React.JSX.Element {
  if (isRunning) {
    return (
      <Button variant="destructive" size="sm" onClick={onStop}>
        Stop
      </Button>
    );
  }
  return (
    <Button variant="default" size="sm" disabled={!canStart} onClick={onStart}>
      Start Search
    </Button>
  );
}
