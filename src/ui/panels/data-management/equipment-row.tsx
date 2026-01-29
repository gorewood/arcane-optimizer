/**
 * EquipmentRow — single equipment item row with actions.
 */

import { Button } from "@/components/ui/button";
import type { EquipmentPiece } from "@/models/types";
import type { MergedItem } from "@/data/user-data-types";
import { SlotBadge } from "@/ui/panels/slot-badge";
import { StatSummary } from "@/ui/panels/stat-summary";
import { SourceBadge } from "./source-badge";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface EquipmentRowProps {
  readonly item: MergedItem<EquipmentPiece>;
  readonly onEdit: () => void;
  readonly onDelete: () => void;
  readonly onReset?: (() => void) | undefined;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EquipmentRow({
  item,
  onEdit,
  onDelete,
  onReset,
}: EquipmentRowProps): React.JSX.Element {
  const equipment = item.item;

  return (
    <div className="flex items-center gap-2 px-2 py-1.5 bg-bg-surface hover:bg-bg-elevated transition-colors">
      <span className="text-sm text-text-primary truncate flex-1">
        {equipment.name}
      </span>
      <SourceBadge item={item} />
      <SlotBadge slot={equipment.slot} />
      {equipment.socketCount > 0 && (
        <span className="text-xs text-rarity-rare" title={`${String(equipment.socketCount)} sockets`}>
          {equipment.socketCount}&#x25C6;
        </span>
      )}
      <StatSummary stats={equipment.baseStats} />
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
// DeletedEquipmentRow — for restore UI
// ---------------------------------------------------------------------------

export function DeletedEquipmentRow({
  item,
  onRestore,
}: {
  readonly item: MergedItem<EquipmentPiece>;
  readonly onRestore: () => void;
}): React.JSX.Element {
  const equipment = item.item;

  return (
    <div className="flex items-center gap-2 px-2 py-1.5 bg-bg-surface/50 opacity-60">
      <span className="text-sm text-text-muted truncate flex-1 line-through">
        {equipment.name}
      </span>
      <SlotBadge slot={equipment.slot} />
      <Button variant="ghost" size="xs" onClick={onRestore}>
        Restore
      </Button>
    </div>
  );
}
