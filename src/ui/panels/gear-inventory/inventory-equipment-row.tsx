/**
 * InventoryEquipmentRow — unified row with enable/disable checkbox and edit actions.
 * Shows item name with optional set/source metadata below.
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
    <div className="flex items-center gap-2 px-2 py-1.5 bg-bg-surface hover:bg-bg-elevated transition-colors">
      <input
        type="checkbox"
        checked={enabled}
        onChange={() => { toggle(item.id); }}
        className="size-3.5 rounded border-border-default accent-accent-gold shrink-0"
        title={enabled ? "Disable for optimizer" : "Enable for optimizer"}
      />
      <NameWithSource name={item.name} source={item.source} />
      <SourceBadge item={merged} />
      <SlotBadge slot={item.slot} />
      <SocketBadge count={item.socketCount} />
      <StatSummary stats={item.baseStats} />
      <RowActions
        isBundled={merged.source === "bundled"}
        isModified={merged.isModified}
        onEdit={onEdit}
        onDelete={onDelete}
        onReset={onReset}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// NameWithSource
// ---------------------------------------------------------------------------

function NameWithSource({
  name,
  source,
}: {
  readonly name: string;
  readonly source?: string | undefined;
}): React.JSX.Element {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 min-w-0 flex-1">
      <span className="text-sm text-text-primary truncate">{name}</span>
      {source !== undefined && (
        <span className="text-xs text-text-muted truncate">{source}</span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SocketBadge
// ---------------------------------------------------------------------------

function SocketBadge({ count }: { readonly count: number }): React.JSX.Element | null {
  if (count <= 0) return null;
  return (
    <span className="text-xs text-rarity-rare shrink-0" title={`${String(count)} sockets`}>
      {count}&#x25C6;
    </span>
  );
}

// ---------------------------------------------------------------------------
// RowActions
// ---------------------------------------------------------------------------

function RowActions({
  isBundled,
  isModified,
  onEdit,
  onDelete,
  onReset,
}: {
  readonly isBundled: boolean;
  readonly isModified: boolean;
  readonly onEdit: () => void;
  readonly onDelete: () => void;
  readonly onReset?: (() => void) | undefined;
}): React.JSX.Element {
  return (
    <div className="flex gap-0.5 ml-1 shrink-0">
      <Button variant="ghost" size="xs" className="px-1.5" onClick={onEdit}>
        Edit
      </Button>
      {isModified && onReset !== undefined && (
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
        {isBundled ? "Hide" : "Del"}
      </Button>
    </div>
  );
}
