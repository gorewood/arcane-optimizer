/**
 * ConstraintRow -- single constraint editor row.
 *
 * Displays stat name, constraint type, value, weight slider, hardCap,
 * and a remove button. Compact game-UI feel.
 */

import { useCallback, useState } from "react";
import type { ConstraintType, SoftConstraint, StatName } from "@/models/types";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { STAT_NAMES } from "@/search/stats";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CONSTRAINT_TYPES: readonly ConstraintType[] = [
  "minimize",
  "maximize",
  "atLeast",
  "atMost",
  "between",
  "exactly",
];

/** Constraint types that require a value input. */
const VALUE_TYPES = new Set<ConstraintType>([
  "atLeast",
  "atMost",
  "between",
  "exactly",
]);

/** Constraint types that support a hardCap input (max value for 'between'). */
const HARDCAP_TYPES = new Set<ConstraintType>(["between"]);

/** Human-readable labels for constraint types. */
const TYPE_LABELS: Readonly<Record<ConstraintType, string>> = {
  minimize: "min",
  maximize: "max",
  atLeast: "\u2265",
  atMost: "\u2264",
  between: "\u2194",
  exactly: "=",
};

/** Stat-specific max values (game limits). */
const STAT_MAX_VALUES: Readonly<Partial<Record<StatName, number>>> = {
  insanity: 5,
  warding: 6,
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ConstraintRowProps {
  readonly constraint: SoftConstraint;
  readonly index: number;
  readonly onUpdate: (index: number, constraint: SoftConstraint) => void;
  readonly onRemove: (index: number) => void;
}

// ---------------------------------------------------------------------------
// Linked value/hardCap handlers
// ---------------------------------------------------------------------------

function useValueHandler(
  constraint: SoftConstraint,
  index: number,
  onUpdate: (i: number, c: SoftConstraint) => void,
  statMax: number | undefined,
): (v: number) => void {
  return useCallback((v: number) => {
    const clamped = statMax != null ? Math.min(v, statMax) : v;
    let newHardCap = constraint.hardCap;
    if (newHardCap != null && newHardCap < clamped) newHardCap = clamped;
    onUpdate(index, { ...constraint, value: clamped, hardCap: newHardCap });
  }, [constraint, index, onUpdate, statMax]);
}

function useHardCapHandler(
  constraint: SoftConstraint,
  index: number,
  onUpdate: (i: number, c: SoftConstraint) => void,
  statMax: number | undefined,
): (hc: number | undefined) => void {
  return useCallback((hc: number | undefined) => {
    const clamped = hc != null && statMax != null ? Math.min(hc, statMax) : hc;
    let newValue = constraint.value ?? 0;
    if (clamped != null && newValue > clamped) newValue = clamped;
    onUpdate(index, { ...constraint, value: newValue, hardCap: clamped });
  }, [constraint, index, onUpdate, statMax]);
}

// ---------------------------------------------------------------------------
// ConstraintRow — grid layout for column alignment
// ---------------------------------------------------------------------------

export function ConstraintRow({ constraint, index, onUpdate, onRemove }: ConstraintRowProps): React.JSX.Element {
  const showValue = VALUE_TYPES.has(constraint.type);
  const showHardCap = HARDCAP_TYPES.has(constraint.type);
  const isBetween = constraint.type === "between";
  const statMax = STAT_MAX_VALUES[constraint.stat];
  const handleValue = useValueHandler(constraint, index, onUpdate, statMax);
  const handleHardCap = useHardCapHandler(constraint, index, onUpdate, statMax);

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-border-subtle bg-bg-surface px-2 py-1.5 transition-colors hover:border-border-default">
      {/* Row 1: stat + operator (always together) */}
      <div className="flex items-center gap-2 shrink-0">
        <StatSelect value={constraint.stat} onChange={(s) => { onUpdate(index, { ...constraint, stat: s }); }} />
        <TypeSelect value={constraint.type} onChange={(t) => { handleTypeChange(constraint, index, t, onUpdate); }} />
      </div>
      {/* Row 2 on narrow, continues row 1 on wide: value, cap, weight, remove */}
      <div className="flex flex-1 items-center gap-2 min-w-[16rem]">
        <div className="w-[4.5rem]">{showValue && <ValueInput value={constraint.value ?? 0} onChange={handleValue} max={statMax} resetKey={`${constraint.stat}-${constraint.type}`} />}</div>
        <div className="w-24">{showHardCap && <CapInput value={constraint.hardCap} onChange={handleHardCap} label={isBetween ? "to" : "cap"} max={statMax} resetKey={`${constraint.stat}-${constraint.type}`} />}</div>
        <div className="flex-1" />
        <WeightControl weight={constraint.weight} onChange={(w) => { onUpdate(index, { ...constraint, weight: w }); }} />
        <RemoveButton index={index} onRemove={onRemove} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Type change handler (extracted for line-count)
// ---------------------------------------------------------------------------

function handleTypeChange(
  constraint: SoftConstraint,
  index: number,
  type: ConstraintType,
  onUpdate: (i: number, c: SoftConstraint) => void,
): void {
  onUpdate(index, {
    ...constraint,
    type,
    value: VALUE_TYPES.has(type) ? (constraint.value ?? 0) : undefined,
    hardCap: HARDCAP_TYPES.has(type) ? constraint.hardCap : undefined,
  });
}

// ---------------------------------------------------------------------------
// RemoveButton
// ---------------------------------------------------------------------------

function RemoveButton({
  index,
  onRemove,
}: {
  readonly index: number;
  readonly onRemove: (index: number) => void;
}): React.JSX.Element {
  return (
    <Button
      variant="ghost"
      size="icon-xs"
      className="text-text-muted hover:text-stat-negative shrink-0"
      onClick={() => {
        onRemove(index);
      }}
      title="Remove constraint"
    >
      <span aria-hidden="true">&times;</span>
    </Button>
  );
}

// ---------------------------------------------------------------------------
// StatSelect
// ---------------------------------------------------------------------------

/** Runtime check: all valid stat names for Select onValueChange. */
const STAT_NAME_SET: ReadonlySet<string> = new Set<string>(STAT_NAMES);

function isStatName(value: string): value is StatName {
  return STAT_NAME_SET.has(value);
}

/** Runtime check: all valid constraint types for Select onValueChange. */
const CONSTRAINT_TYPE_SET: ReadonlySet<string> = new Set<string>(
  CONSTRAINT_TYPES,
);

function isConstraintType(value: string): value is ConstraintType {
  return CONSTRAINT_TYPE_SET.has(value);
}

function StatSelect({
  value,
  onChange,
}: {
  readonly value: StatName;
  readonly onChange: (stat: StatName) => void;
}): React.JSX.Element {
  return (
    <Select
      value={value}
      onValueChange={(v) => {
        if (isStatName(v)) onChange(v);
      }}
    >
      <SelectTrigger size="sm" className="w-32 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {STAT_NAMES.map((stat) => (
          <SelectItem key={stat} value={stat}>
            {stat}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ---------------------------------------------------------------------------
// TypeSelect
// ---------------------------------------------------------------------------

function TypeSelect({
  value,
  onChange,
}: {
  readonly value: ConstraintType;
  readonly onChange: (type: ConstraintType) => void;
}): React.JSX.Element {
  return (
    <Select
      value={value}
      onValueChange={(v) => {
        if (isConstraintType(v)) onChange(v);
      }}
    >
      <SelectTrigger size="sm" className="w-full text-xs font-stat">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {CONSTRAINT_TYPES.map((ct) => (
          <SelectItem key={ct} value={ct}>
            <span className="font-stat">{TYPE_LABELS[ct]}</span>
            <span className="ml-1 text-text-muted">{ct}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ---------------------------------------------------------------------------
// ValueInput — uses local state during editing, commits on blur/Enter
// ---------------------------------------------------------------------------

function ValueInput({
  value,
  onChange,
  max,
  resetKey,
}: {
  readonly value: number;
  readonly onChange: (value: number) => void;
  readonly max?: number | undefined;
  readonly resetKey?: string | undefined;
}): React.JSX.Element {
  // Use resetKey to force re-initialization when external value changes
  const [localValue, setLocalValue] = useState(String(value));
  const [lastResetKey, setLastResetKey] = useState(resetKey);

  // Reset local state when resetKey changes (e.g., preset load or stat change)
  if (resetKey !== lastResetKey) {
    setLocalValue(String(value));
    setLastResetKey(resetKey);
  }

  const commit = useCallback(() => {
    const parsed = Number(localValue);
    if (Number.isNaN(parsed) || parsed < 0) {
      setLocalValue(String(value)); // Reset to last valid
      return;
    }
    const normalized = Math.max(0, Math.round(parsed));
    const clamped = max != null ? Math.min(normalized, max) : normalized;
    setLocalValue(String(clamped));
    if (clamped !== value) onChange(clamped);
  }, [localValue, value, max, onChange]);

  return (
    <input
      type="number"
      value={localValue}
      min={0}
      max={max}
      onChange={(e) => { setLocalValue(e.target.value); }}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === "Enter") commit(); }}
      className="w-full rounded-md border border-border-default bg-bg-elevated px-1.5 py-1 text-xs font-stat text-text-primary text-center focus:border-accent-gold focus:outline-none focus:ring-1 focus:ring-accent-gold"
      title={max != null ? `Value (max: ${String(max)})` : "Target value"}
    />
  );
}

// ---------------------------------------------------------------------------
// WeightControl
// ---------------------------------------------------------------------------

function WeightControl({
  weight,
  onChange,
}: {
  readonly weight: number;
  readonly onChange: (weight: number) => void;
}): React.JSX.Element {
  return (
    <div className="flex items-center gap-1.5 min-w-[8rem]">
      <span className="text-[10px] text-text-muted shrink-0">W:</span>
      <Slider
        min={1}
        max={100}
        value={[weight]}
        onValueChange={(vals) => {
          const first = vals[0];
          if (first != null) onChange(first);
        }}
        className="flex-1"
      />
      <span className="font-stat text-xs text-accent-gold w-6 text-right">
        {weight}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CapInput — uses local state during editing, commits on blur/Enter
// ---------------------------------------------------------------------------

function CapInput({
  value,
  onChange,
  label,
  max,
  resetKey,
}: {
  readonly value: number | undefined;
  readonly onChange: (value: number | undefined) => void;
  readonly label: string;
  readonly max?: number | undefined;
  readonly resetKey?: string | undefined;
}): React.JSX.Element {
  const [localValue, setLocalValue] = useState(value != null ? String(value) : "");
  const [lastResetKey, setLastResetKey] = useState(resetKey);

  // Reset local state when resetKey changes
  if (resetKey !== lastResetKey) {
    setLocalValue(value != null ? String(value) : "");
    setLastResetKey(resetKey);
  }

  const commit = useCallback(() => {
    if (localValue === "") {
      if (value !== undefined) onChange(undefined);
      return;
    }
    const parsed = Number(localValue);
    if (Number.isNaN(parsed) || parsed < 0) {
      setLocalValue(value != null ? String(value) : ""); // Reset to last valid
      return;
    }
    const normalized = Math.max(0, Math.round(parsed));
    const clamped = max != null ? Math.min(normalized, max) : normalized;
    setLocalValue(String(clamped));
    if (clamped !== value) onChange(clamped);
  }, [localValue, value, max, onChange]);

  return (
    <div className="flex items-center gap-1">
      <span className="text-[10px] text-text-muted shrink-0">{label}</span>
      <input
        type="number"
        value={localValue}
        placeholder="—"
        min={0}
        max={max}
        onChange={(e) => { setLocalValue(e.target.value); }}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === "Enter") commit(); }}
        className="w-12 rounded-md border border-border-default bg-bg-elevated px-1 py-1 text-xs font-stat text-text-primary text-center focus:border-accent-gold focus:outline-none focus:ring-1 focus:ring-accent-gold placeholder:text-text-muted"
        title={max != null ? `${label} (max: ${String(max)})` : `${label} (optional)`}
      />
    </div>
  );
}
