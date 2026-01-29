/**
 * ModifierRow — single modifier item row with actions.
 */

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Modifier } from "@/models/types";
import type { MergedItem } from "@/data/user-data-types";
import { StatSummary } from "@/ui/panels/stat-summary";
import { SourceBadge } from "./source-badge";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ModifierRowProps {
  readonly item: MergedItem<Modifier>;
  readonly onEdit: () => void;
  readonly onDelete: () => void;
  readonly onReset?: (() => void) | undefined;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ModifierRow({
  item,
  onEdit,
  onDelete,
  onReset,
}: ModifierRowProps): React.JSX.Element {
  const modifier = item.item;

  return (
    <div className="flex items-center gap-2 px-2 py-1.5 bg-bg-surface hover:bg-bg-elevated transition-colors">
      <span className="text-sm text-text-primary truncate flex-1">
        {modifier.name}
      </span>
      <SourceBadge item={item} />
      {modifier.grantsSocket === true && <SocketBadge />}
      {modifier.atlanteanBehavior !== undefined && <AtlanteanBadge />}
      <StatSummary stats={modifier.stats} />
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
// Helper Badges
// ---------------------------------------------------------------------------

function SocketBadge(): React.JSX.Element {
  return (
    <Badge className="bg-rarity-rare/20 text-rarity-rare border-rarity-rare/30 px-1.5 py-0 text-[10px]">
      +Socket
    </Badge>
  );
}

function AtlanteanBadge(): React.JSX.Element {
  return (
    <Badge className="bg-rarity-exotic/20 text-rarity-exotic border-rarity-exotic/30 px-1.5 py-0 text-[10px]">
      Atlantean
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// DeletedModifierRow — for restore UI
// ---------------------------------------------------------------------------

export function DeletedModifierRow({
  item,
  onRestore,
}: {
  readonly item: MergedItem<Modifier>;
  readonly onRestore: () => void;
}): React.JSX.Element {
  const modifier = item.item;

  return (
    <div className="flex items-center gap-2 px-2 py-1.5 bg-bg-surface/50 opacity-60">
      <span className="text-sm text-text-muted truncate flex-1 line-through">
        {modifier.name}
      </span>
      <Button variant="ghost" size="xs" onClick={onRestore}>
        Restore
      </Button>
    </div>
  );
}
