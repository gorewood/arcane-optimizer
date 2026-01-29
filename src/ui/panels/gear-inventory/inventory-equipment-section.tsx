/**
 * InventoryEquipmentSection — grouped equipment list with edit actions.
 */

import { useState, useMemo, useCallback } from "react";
import type { EquipmentPiece, SlotType } from "@/models/types";
import type { MergedItem } from "@/data/user-data-types";
import { useUserDataStore } from "@/stores/user-data-store";
import type { GroupByOption } from "@/ui/panels/group-by-select";
import type { SortOption } from "@/ui/panels/sort-select";
import { InventoryEquipmentRow } from "./inventory-equipment-row";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type MergedEquipment = MergedItem<EquipmentPiece>;

interface ItemGroup {
  readonly name: string;
  readonly items: readonly MergedEquipment[];
}

// ---------------------------------------------------------------------------
// Grouping
// ---------------------------------------------------------------------------

const SLOT_DISPLAY_ORDER: readonly SlotType[] = [
  "chestplate", "leggings", "accessory", "accessory-H", "accessory-A",
];
const SLOT_LABELS: Record<SlotType, string> = {
  chestplate: "Chestplates",
  leggings: "Leggings",
  accessory: "Accessories",
  "accessory-H": "Helmets",
  "accessory-A": "Amulets",
};
const SLOT_TYPE_SET: ReadonlySet<string> = new Set(SLOT_DISPLAY_ORDER);

function isSlotType(value: string): value is SlotType {
  return SLOT_TYPE_SET.has(value);
}

function groupItems(
  equipment: readonly MergedEquipment[],
  groupBy: GroupByOption,
): readonly ItemGroup[] {
  if (groupBy === "none") {
    return [{ name: "All Equipment", items: equipment }];
  }

  const groups = new Map<string, MergedEquipment[]>();
  for (const merged of equipment) {
    const item = merged.item;
    let key: string;
    switch (groupBy) {
      case "set": key = item.setName ?? "Standalone"; break;
      case "slot": key = item.slot; break;
      case "source": key = item.source ?? "Unknown"; break;
    }
    const existing = groups.get(key);
    if (existing) { existing.push(merged); } else { groups.set(key, [merged]); }
  }

  const entries = Array.from(groups.entries());
  if (groupBy === "slot") {
    entries.sort((a, b) => {
      const aIdx = isSlotType(a[0]) ? SLOT_DISPLAY_ORDER.indexOf(a[0]) : -1;
      const bIdx = isSlotType(b[0]) ? SLOT_DISPLAY_ORDER.indexOf(b[0]) : -1;
      return aIdx - bIdx;
    });
  } else {
    entries.sort((a, b) => a[0].localeCompare(b[0]));
  }

  return entries.map(([key, items]) => ({
    name: groupBy === "slot" && isSlotType(key) ? SLOT_LABELS[key] : key,
    items,
  }));
}

// ---------------------------------------------------------------------------
// InventoryEquipmentSection
// ---------------------------------------------------------------------------

export function InventoryEquipmentSection({
  equipment,
  groupBy,
  sortBy,
  onEdit,
}: {
  readonly equipment: readonly MergedEquipment[];
  readonly groupBy: GroupByOption;
  readonly sortBy: SortOption;
  readonly onEdit: (equipment: EquipmentPiece) => void;
}): React.JSX.Element {
  const groups = useMemo(() => groupItems(equipment, groupBy), [equipment, groupBy]);

  const deleteEquipment = useUserDataStore((s) => s.deleteEquipment);
  const restoreEquipment = useUserDataStore((s) => s.restoreEquipment);

  const handleDelete = useCallback((id: string) => { deleteEquipment(id); }, [deleteEquipment]);
  const handleReset = useCallback((id: string) => { restoreEquipment(id); }, [restoreEquipment]);

  // Hide metadata that's redundant with current sort
  const hideSet = sortBy === "set-name";
  const hideSource = sortBy === "source-name";

  return (
    <div className="space-y-1">
      <p className="text-xs text-text-muted px-1">{equipment.length} items</p>
      {groups.length === 0 ? (
        <p className="text-text-muted text-xs px-1">No matching equipment.</p>
      ) : (
        groups.map((group) => (
          <ItemGroupBlock
            key={group.name}
            group={group}
            hideSet={hideSet}
            hideSource={hideSource}
            onEdit={onEdit}
            onDelete={handleDelete}
            onReset={handleReset}
          />
        ))
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ItemGroupBlock
// ---------------------------------------------------------------------------

function ItemGroupBlock({
  group,
  hideSet,
  hideSource,
  onEdit,
  onDelete,
  onReset,
}: {
  readonly group: ItemGroup;
  readonly hideSet: boolean;
  readonly hideSource: boolean;
  readonly onEdit: (equipment: EquipmentPiece) => void;
  readonly onDelete: (id: string) => void;
  readonly onReset: (id: string) => void;
}): React.JSX.Element {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="border border-border-subtle rounded-md overflow-hidden">
      <button
        type="button"
        onClick={() => { setExpanded((prev) => !prev); }}
        className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm font-medium text-text-primary bg-bg-elevated hover:bg-bg-surface transition-colors"
      >
        <span className="text-text-muted text-xs">{expanded ? "\u25BC" : "\u25B6"}</span>
        <span>{group.name}</span>
        <span className="text-xs text-text-muted">
          ({group.items.length} {group.items.length === 1 ? "piece" : "pieces"})
        </span>
      </button>
      {expanded && (
        <div className="divide-y divide-border-subtle">
          {group.items.map((merged) => (
            <InventoryEquipmentRow
              key={merged.item.id}
              merged={merged}
              hideSet={hideSet}
              hideSource={hideSource}
              onEdit={() => { onEdit(merged.item); }}
              onDelete={() => { onDelete(merged.item.id); }}
              onReset={merged.isModified ? () => { onReset(merged.item.id); } : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}
