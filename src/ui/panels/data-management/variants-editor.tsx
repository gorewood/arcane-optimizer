/**
 * VariantsEditor — collapsible section for editing equipment variants.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Stats } from "@/models/types";
import { VariantRow } from "./variant-row";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface VariantsEditorProps {
  readonly variants: Readonly<Record<string, Partial<Stats>>> | undefined;
  readonly onChange: (variants: Readonly<Record<string, Partial<Stats>>> | undefined) => void;
  readonly disabled?: boolean | undefined;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function VariantsEditor({
  variants,
  onChange,
  disabled = false,
}: VariantsEditorProps): React.JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const [newVariantName, setNewVariantName] = useState("");
  const entries = Object.entries(variants ?? {});

  const addVariant = (): void => {
    if (newVariantName.trim() === "") return;
    onChange({ ...(variants ?? {}), [newVariantName.trim()]: {} });
    setNewVariantName("");
  };

  const removeVariant = (name: string): void => {
    const { [name]: _, ...rest } = variants ?? {};
    onChange(Object.keys(rest).length > 0 ? rest : undefined);
  };

  const updateVariant = (name: string, stats: Partial<Stats>): void => {
    onChange({ ...(variants ?? {}), [name]: stats });
  };

  return (
    <div className="border border-border-subtle rounded-md overflow-hidden">
      <VariantsHeader
        expanded={expanded}
        count={entries.length}
        onToggle={() => { setExpanded((p) => !p); }}
      />
      {expanded && (
        <VariantsContent
          entries={entries}
          disabled={disabled}
          newVariantName={newVariantName}
          onNewNameChange={setNewVariantName}
          onAdd={addVariant}
          onRemove={removeVariant}
          onUpdate={updateVariant}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function VariantsHeader({
  expanded,
  count,
  onToggle,
}: {
  readonly expanded: boolean;
  readonly count: number;
  readonly onToggle: () => void;
}): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm bg-bg-elevated hover:bg-bg-surface"
    >
      <span className="text-text-muted text-xs">{expanded ? "\u25BC" : "\u25B6"}</span>
      <span className="text-text-primary font-medium">Variants</span>
      <span className="text-xs text-text-muted">({String(count)})</span>
    </button>
  );
}

function VariantsContent({
  entries,
  disabled,
  newVariantName,
  onNewNameChange,
  onAdd,
  onRemove,
  onUpdate,
}: {
  readonly entries: readonly [string, Partial<Stats>][];
  readonly disabled: boolean;
  readonly newVariantName: string;
  readonly onNewNameChange: (name: string) => void;
  readonly onAdd: () => void;
  readonly onRemove: (name: string) => void;
  readonly onUpdate: (name: string, stats: Partial<Stats>) => void;
}): React.JSX.Element {
  return (
    <div className="p-3 space-y-3 bg-bg-surface">
      {entries.map(([name, stats]) => (
        <VariantRow
          key={name}
          name={name}
          stats={stats}
          disabled={disabled}
          onRemove={() => { onRemove(name); }}
          onChange={(s) => { onUpdate(name, s); }}
        />
      ))}
      {!disabled && (
        <div className="flex gap-2">
          <Input
            value={newVariantName}
            onChange={(e) => { onNewNameChange(e.target.value); }}
            placeholder="New variant name..."
            className="h-7 text-xs flex-1"
          />
          <Button variant="outline" size="xs" onClick={onAdd}>
            Add
          </Button>
        </div>
      )}
    </div>
  );
}
