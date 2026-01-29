/**
 * GemRow — single gem item row with actions.
 */

import { Button } from "@/components/ui/button";
import type { Gem } from "@/models/types";
import type { MergedItem } from "@/data/user-data-types";
import { StatSummary } from "@/ui/panels/stat-summary";
import { SourceBadge } from "./source-badge";
import { TierBadge } from "./tier-badge";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface GemRowProps {
  readonly item: MergedItem<Gem>;
  readonly onEdit: () => void;
  readonly onDelete: () => void;
  readonly onReset?: (() => void) | undefined;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function GemRow({
  item,
  onEdit,
  onDelete,
  onReset,
}: GemRowProps): React.JSX.Element {
  const gem = item.item;

  return (
    <div className="flex items-center gap-2 px-2 py-1.5 bg-bg-surface hover:bg-bg-elevated transition-colors">
      <span className="text-sm text-text-primary truncate flex-1">
        {gem.name}
      </span>
      <SourceBadge item={item} />
      <TierBadge tier={gem.tier} />
      <StatSummary stats={gem.stats} />
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
// DeletedGemRow — for restore UI
// ---------------------------------------------------------------------------

export function DeletedGemRow({
  item,
  onRestore,
}: {
  readonly item: MergedItem<Gem>;
  readonly onRestore: () => void;
}): React.JSX.Element {
  const gem = item.item;

  return (
    <div className="flex items-center gap-2 px-2 py-1.5 bg-bg-surface/50 opacity-60">
      <span className="text-sm text-text-muted truncate flex-1 line-through">
        {gem.name}
      </span>
      <TierBadge tier={gem.tier} />
      <Button variant="ghost" size="xs" onClick={onRestore}>
        Restore
      </Button>
    </div>
  );
}
