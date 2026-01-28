/**
 * ConstraintRow -- single constraint editor row.
 *
 * Displays stat name, constraint type, value, weight slider, hardCap,
 * and a remove button. Compact game-UI feel.
 */

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
  "target",
  "exactly",
];

/** Constraint types that require a value input. */
const VALUE_TYPES = new Set<ConstraintType>([
  "atLeast",
  "atMost",
  "target",
  "exactly",
]);

/** Constraint types that support a hardCap input. */
const HARDCAP_TYPES = new Set<ConstraintType>(["atMost", "target"]);

/** Human-readable labels for constraint types. */
const TYPE_LABELS: Readonly<Record<ConstraintType, string>> = {
  minimize: "min",
  maximize: "max",
  atLeast: "\u2265",
  atMost: "\u2264",
  target: "\u2248",
  exactly: "=",
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
// ConstraintRow
// ---------------------------------------------------------------------------

export function ConstraintRow({
  constraint,
  index,
  onUpdate,
  onRemove,
}: ConstraintRowProps): React.JSX.Element {
  const showValue = VALUE_TYPES.has(constraint.type);
  const showHardCap = HARDCAP_TYPES.has(constraint.type);

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-border-subtle bg-bg-surface px-2 py-1.5 transition-colors hover:border-border-default">
      <StatSelect
        value={constraint.stat}
        onChange={(stat) => {
          onUpdate(index, { ...constraint, stat });
        }}
      />
      <TypeSelect
        value={constraint.type}
        onChange={(type) => {
          handleTypeChange(constraint, index, type, onUpdate);
        }}
      />
      {showValue && (
        <ValueInput
          value={constraint.value ?? 0}
          onChange={(v) => {
            onUpdate(index, { ...constraint, value: v });
          }}
        />
      )}
      <WeightControl
        weight={constraint.weight}
        onChange={(w) => {
          onUpdate(index, { ...constraint, weight: w });
        }}
      />
      {showHardCap && (
        <HardCapInput
          value={constraint.hardCap}
          onChange={(hc) => {
            onUpdate(index, { ...constraint, hardCap: hc });
          }}
        />
      )}
      <RemoveButton index={index} onRemove={onRemove} />
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
      <SelectTrigger size="sm" className="w-16 text-xs font-stat">
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
// ValueInput
// ---------------------------------------------------------------------------

function ValueInput({
  value,
  onChange,
}: {
  readonly value: number;
  readonly onChange: (value: number) => void;
}): React.JSX.Element {
  return (
    <input
      type="number"
      value={value}
      onChange={(e) => {
        const parsed = Number(e.target.value);
        if (!Number.isNaN(parsed)) {
          onChange(parsed);
        }
      }}
      className="w-16 rounded-md border border-border-default bg-bg-elevated px-1.5 py-1 text-xs font-stat text-text-primary text-center focus:border-accent-gold focus:outline-none focus:ring-1 focus:ring-accent-gold"
      title="Target value"
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
// HardCapInput
// ---------------------------------------------------------------------------

function HardCapInput({
  value,
  onChange,
}: {
  readonly value: number | undefined;
  readonly onChange: (value: number | undefined) => void;
}): React.JSX.Element {
  return (
    <div className="flex items-center gap-0.5">
      <span className="text-[10px] text-text-muted shrink-0">cap:</span>
      <input
        type="number"
        value={value ?? ""}
        placeholder="--"
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === "") {
            onChange(undefined);
            return;
          }
          const parsed = Number(raw);
          if (!Number.isNaN(parsed)) {
            onChange(parsed);
          }
        }}
        className="w-14 rounded-md border border-border-default bg-bg-elevated px-1.5 py-1 text-xs font-stat text-text-primary text-center focus:border-accent-gold focus:outline-none focus:ring-1 focus:ring-accent-gold placeholder:text-text-muted"
        title="Hard cap (optional)"
      />
    </div>
  );
}
