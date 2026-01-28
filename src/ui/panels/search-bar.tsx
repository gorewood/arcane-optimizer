/**
 * SearchBar — dense single-row search controls.
 *
 * Compact horizontal bar with algorithm toggle, enhancement mode toggle,
 * max results dropdown, and start/stop button. Progress strip appears
 * below when search is running.
 */

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSearchStore, type Algorithm } from "@/stores/search-store";
import type { EnhancementMode } from "@/models/types";
import type { ProgressState } from "@/ui/hooks/use-search-worker";
import { WarningMessage, ProgressDisplay, ErrorDisplay } from "./search-feedback";

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
  const enhancementMode = useSearchStore((s) => s.enhancementMode);
  const setAlgorithm = useSearchStore((s) => s.setAlgorithm);
  const setEnhancementMode = useSearchStore((s) => s.setEnhancementMode);
  const error = useSearchStore((s) => s.error);

  const isRunning = status === "running";
  const canStart = status === "idle" || status === "complete" || status === "error";

  return (
    <div className="space-y-2">
      {/* Main controls row */}
      <div className="flex items-center gap-2 flex-wrap">
        <AlgorithmToggle value={algorithm} onChange={setAlgorithm} disabled={isRunning} />
        <EnhancementToggle value={enhancementMode} onChange={setEnhancementMode} disabled={isRunning} />
        <MaxResultsSelect value={maxResults} onChange={onMaxResultsChange} disabled={isRunning} />
        <div className="flex-1" />
        <SearchButton
          isRunning={isRunning}
          canStart={canStart}
          onStart={onStart}
          onStop={onStop}
        />
      </div>

      {/* Feedback area */}
      {warning != null && <WarningMessage message={warning} />}
      {isRunning && <ProgressDisplay progress={progress} />}
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
      <ToggleOption
        label="Exhaust"
        selected={value === "exhaustive"}
        onClick={() => { onChange("exhaustive"); }}
        disabled={disabled}
      />
      <ToggleOption
        label="Genetic"
        selected={value === "genetic"}
        onClick={() => { onChange("genetic"); }}
        disabled={disabled}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// EnhancementToggle
// ---------------------------------------------------------------------------

function EnhancementToggle({
  value,
  onChange,
  disabled,
}: {
  readonly value: EnhancementMode;
  readonly onChange: (v: EnhancementMode) => void;
  readonly disabled: boolean;
}): React.JSX.Element {
  return (
    <div className="flex rounded-md border border-border-default overflow-hidden">
      <ToggleOption
        label="None"
        selected={value === "none"}
        onClick={() => { onChange("none"); }}
        disabled={disabled}
      />
      <ToggleOption
        label="Budget"
        selected={value === "budget-aware"}
        onClick={() => { onChange("budget-aware"); }}
        disabled={disabled}
      />
      <ToggleOption
        label="Greedy"
        selected={value === "greedy"}
        onClick={() => { onChange("greedy"); }}
        disabled={disabled}
      />
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
      className={`px-2.5 py-1 text-xs transition-colors ${
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
      <Select
        value={String(value)}
        onValueChange={(v) => { onChange(Number(v)); }}
        disabled={disabled}
      >
        <SelectTrigger className="h-7 w-16 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {MAX_RESULTS_OPTIONS.map((n) => (
            <SelectItem key={n} value={String(n)}>
              {n}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
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
