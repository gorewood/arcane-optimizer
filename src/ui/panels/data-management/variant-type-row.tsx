/**
 * VariantTypeRow — single variant type entry row with actions.
 */

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { VariantTypeEntry } from "@/models/types";
import type { MergedItem } from "@/data/user-data-types";
import { SourceBadge } from "./source-badge";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface VariantTypeRowProps {
  readonly item: MergedItem<VariantTypeEntry & { readonly key: string }>;
  readonly onEdit: () => void;
  readonly onDelete: () => void;
  readonly onReset?: (() => void) | undefined;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function VariantTypeRow({
  item,
  onEdit,
  onDelete,
  onReset,
}: VariantTypeRowProps): React.JSX.Element {
  const entry = item.item;

  return (
    <div className="flex items-center gap-2 px-2 py-1.5 bg-bg-surface hover:bg-bg-elevated transition-colors">
      <span className="text-sm text-text-primary truncate flex-1">
        {entry.label}
      </span>
      <span className="text-xs text-text-muted font-mono">{entry.key}</span>
      <SourceBadge item={item} />
      <Badge className="bg-accent-gold/20 text-accent-gold border-accent-gold/30 px-1.5 py-0 text-[10px]">
        {entry.variants.length} variants
      </Badge>
      <div className="flex gap-1 ml-2">
        <Button variant="ghost" size="xs" onClick={onEdit}>
          Edit
        </Button>
        {item.isModified && onReset && (
          <Button variant="ghost" size="xs" onClick={onReset}>
            Reset
          </Button>
        )}
        <Button
          variant="ghost"
          size="xs"
          className="text-stat-negative hover:text-stat-negative"
          onClick={onDelete}
        >
          {item.source === "bundled" ? "Hide" : "Delete"}
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DeletedVariantTypeRow — for restore UI
// ---------------------------------------------------------------------------

export function DeletedVariantTypeRow({
  item,
  onRestore,
}: {
  readonly item: MergedItem<VariantTypeEntry & { readonly key: string }>;
  readonly onRestore: () => void;
}): React.JSX.Element {
  const entry = item.item;

  return (
    <div className="flex items-center gap-2 px-2 py-1.5 bg-bg-surface/50 opacity-60">
      <span className="text-sm text-text-muted truncate flex-1 line-through">
        {entry.label}
      </span>
      <span className="text-xs text-text-muted font-mono">{entry.key}</span>
      <Button variant="ghost" size="xs" onClick={onRestore}>
        Restore
      </Button>
    </div>
  );
}
