/**
 * InventoryEquipmentRow — unified row with enable/disable checkbox and edit actions.
 */

import { Button } from "@/components/ui/button";
import type { EquipmentPiece } from "@/models/types";
import type { MergedItem } from "@/data/user-data-types";
import { useGearPoolStore } from "@/stores/gear-pool-store";
import { SlotBadge } from "@/ui/panels/slot-badge";
import { StatSummary } from "@/ui/panels/stat-summary";
import { SourceBadge } from "@/ui/panels/data-management/source-badge";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface InventoryEquipmentRowProps {
  readonly merged: MergedItem<EquipmentPiece>;
  readonly onEdit: () => void;
  readonly onDelete: () => void;
  readonly onReset?: (() => void) | undefined;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function InventoryEquipmentRow({
  merged,
  onEdit,
  onDelete,
  onReset,
}: InventoryEquipmentRowProps): React.JSX.Element {
  const item = merged.item;
  const enabled = useGearPoolStore((s) => s.enabledEquipmentIds.has(item.id));
  const toggle = useGearPoolStore((s) => s.toggleEquipment);

  return (
    <div className="flex items-center gap-2 px-2 py-1 bg-bg-surface hover:bg-bg-elevated transition-colors">
      <input
        type="checkbox"
        checked={enabled}
        onChange={() => { toggle(item.id); }}
        className="size-3.5 rounded border-border-default accent-accent-gold"
        title={enabled ? "Disable for optimizer" : "Enable for optimizer"}
      />
      <span className="text-sm text-text-primary truncate flex-1">
        {item.name}
      </span>
      <SourceBadge item={merged} />
      <SlotBadge slot={item.slot} />
      {item.socketCount > 0 && (
        <span className="text-xs text-rarity-rare" title={`${String(item.socketCount)} sockets`}>
          {item.socketCount}&#x25C6;
        </span>
      )}
      <StatSummary stats={item.baseStats} />
      <div className="flex gap-0.5 ml-1">
        <Button variant="ghost" size="xs" className="px-1.5" onClick={onEdit}>
          Edit
        </Button>
        {merged.isModified && onReset && (
          <Button variant="ghost" size="xs" className="px-1.5" onClick={onReset}>
            Reset
          </Button>
        )}
        <Button
          variant="ghost"
          size="xs"
          className="px-1.5 text-stat-negative hover:text-stat-negative"
          onClick={onDelete}
        >
          {merged.source === "bundled" ? "Hide" : "Del"}
        </Button>
      </div>
    </div>
  );
}
