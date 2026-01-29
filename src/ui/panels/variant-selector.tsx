/**
 * VariantSelector -- collapsible panel for selecting enabled variants.
 *
 * Displays variant type groups (e.g., Magic) with toggle buttons for each
 * variant. Includes Select All / Clear buttons per group.
 */

import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { loadVariantTypes } from "@/data/loaders";
import { useFitnessStore } from "@/stores/fitness-store";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// VariantSelector
// ---------------------------------------------------------------------------

export function VariantSelector(): React.JSX.Element {
  const variantTypes = loadVariantTypes();
  const enabledVariants = useFitnessStore((s) => s.enabledVariants);
  const toggleVariant = useFitnessStore((s) => s.toggleVariant);
  const enableAllVariantsOfType = useFitnessStore((s) => s.enableAllVariantsOfType);
  const disableAllVariantsOfType = useFitnessStore((s) => s.disableAllVariantsOfType);

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-accent-gold px-1">
        Variants
        <span className="ml-2 text-xs text-text-muted font-normal">
          ({enabledVariants.size} enabled)
        </span>
      </h3>

      {Object.entries(variantTypes).map(([typeId, typeEntry]) => (
        <VariantTypeGroup
          key={typeId}
          typeId={typeId}
          label={typeEntry.label}
          variants={typeEntry.variants}
          enabledVariants={enabledVariants}
          onToggle={toggleVariant}
          onEnableAll={() => { enableAllVariantsOfType(typeId); }}
          onDisableAll={() => { disableAllVariantsOfType(typeId); }}
        />
      ))}

      {Object.keys(variantTypes).length === 0 && (
        <p className="text-text-muted text-xs px-1">
          No variant types configured.
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// VariantTypeGroup
// ---------------------------------------------------------------------------

interface VariantTypeGroupProps {
  readonly typeId: string;
  readonly label: string;
  readonly variants: readonly string[];
  readonly enabledVariants: ReadonlySet<string>;
  readonly onToggle: (variant: string) => void;
  readonly onEnableAll: () => void;
  readonly onDisableAll: () => void;
}

function VariantTypeGroup({
  typeId,
  label,
  variants,
  enabledVariants,
  onToggle,
  onEnableAll,
  onDisableAll,
}: VariantTypeGroupProps): React.JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const enabledCount = variants.filter((v) => enabledVariants.has(v)).length;

  return (
    <div className="border border-border-subtle rounded-md overflow-hidden">
      <GroupHeader
        label={label}
        enabledCount={enabledCount}
        totalCount={variants.length}
        expanded={expanded}
        onToggle={() => { setExpanded(!expanded); }}
      />
      {expanded && (
        <GroupContent
          typeId={typeId}
          variants={variants}
          enabledVariants={enabledVariants}
          enabledCount={enabledCount}
          onToggle={onToggle}
          onEnableAll={onEnableAll}
          onDisableAll={onDisableAll}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// GroupHeader
// ---------------------------------------------------------------------------

interface GroupHeaderProps {
  readonly label: string;
  readonly enabledCount: number;
  readonly totalCount: number;
  readonly expanded: boolean;
  readonly onToggle: () => void;
}

function GroupHeader({
  label,
  enabledCount,
  totalCount,
  expanded,
  onToggle,
}: GroupHeaderProps): React.JSX.Element {
  return (
    <button
      type="button"
      className="w-full flex items-center justify-between px-3 py-2 bg-surface-raised hover:bg-surface-hover transition-colors"
      onClick={onToggle}
    >
      <span className="flex items-center gap-2 text-sm font-medium text-text-primary">
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-text-muted" />
        ) : (
          <ChevronRight className="w-4 h-4 text-text-muted" />
        )}
        {label}
        <span className="text-xs text-text-muted font-normal">
          ({enabledCount}/{totalCount})
        </span>
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// GroupContent
// ---------------------------------------------------------------------------

interface GroupContentProps {
  readonly typeId: string;
  readonly variants: readonly string[];
  readonly enabledVariants: ReadonlySet<string>;
  readonly enabledCount: number;
  readonly onToggle: (variant: string) => void;
  readonly onEnableAll: () => void;
  readonly onDisableAll: () => void;
}

function GroupContent({
  typeId,
  variants,
  enabledVariants,
  enabledCount,
  onToggle,
  onEnableAll,
  onDisableAll,
}: GroupContentProps): React.JSX.Element {
  const allEnabled = enabledCount === variants.length;
  const noneEnabled = enabledCount === 0;

  return (
    <div className="px-3 py-2 space-y-2 bg-surface-default">
      <VariantGrid
        typeId={typeId}
        variants={variants}
        enabledVariants={enabledVariants}
        onToggle={onToggle}
      />
      <div className="flex gap-2 pt-1">
        <Button
          variant="ghost"
          size="sm"
          className="text-xs h-6 px-2"
          onClick={onEnableAll}
          disabled={allEnabled}
        >
          Select All
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs h-6 px-2"
          onClick={onDisableAll}
          disabled={noneEnabled}
        >
          Clear
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// VariantGrid
// ---------------------------------------------------------------------------

interface VariantGridProps {
  readonly typeId: string;
  readonly variants: readonly string[];
  readonly enabledVariants: ReadonlySet<string>;
  readonly onToggle: (variant: string) => void;
}

function VariantGrid({
  typeId,
  variants,
  enabledVariants,
  onToggle,
}: VariantGridProps): React.JSX.Element {
  return (
    <div className="grid grid-cols-4 gap-1">
      {variants.map((variant) => (
        <Toggle
          key={`${typeId}-${variant}`}
          size="sm"
          variant="outline"
          pressed={enabledVariants.has(variant)}
          onPressedChange={() => { onToggle(variant); }}
          className={cn(
            "text-xs capitalize h-7 px-2",
            enabledVariants.has(variant)
              ? "bg-accent-gold/20 border-accent-gold text-accent-gold"
              : "text-text-muted",
          )}
        >
          {variant}
        </Toggle>
      ))}
    </div>
  );
}
