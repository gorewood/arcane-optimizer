/**
 * EquipmentSection — equipment items grouped by set name, with collapsible
 * groups and individual toggle controls.
 */

import { useState, useMemo } from "react";
import type { EquipmentPiece, SlotType } from "@/models/types";
import { useGearPoolStore } from "@/stores/gear-pool-store";
import { sortItems, type SortOption } from "./sort-select";
import type { GroupByOption } from "./group-by-select";
import { SlotBadge } from "./slot-badge";
import { StatSummary } from "./stat-summary";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ItemGroup {
  readonly name: string;
  readonly items: readonly EquipmentPiece[];
}

// ---------------------------------------------------------------------------
// Grouping helpers
// ---------------------------------------------------------------------------

const SLOT_DISPLAY_ORDER: readonly SlotType[] = [
  "chestplate",
  "leggings",
  "accessory",
  "accessory-H",
  "accessory-A",
];
const SLOT_LABELS: Record<SlotType, string> = {
  chestplate: "Chestplates",
  leggings: "Leggings",
  accessory: "Accessories",
  "accessory-H": "Helmets",
  "accessory-A": "Amulets",
};

function groupItems(
  equipment: readonly EquipmentPiece[],
  groupBy: GroupByOption,
): readonly ItemGroup[] {
  if (groupBy === "none") {
    return [{ name: "All Equipment", items: equipment }];
  }

  const groups = new Map<string, EquipmentPiece[]>();

  for (const item of equipment) {
    let key: string;
    switch (groupBy) {
      case "set":
        key = item.setName ?? "Standalone";
        break;
      case "slot":
        key = item.slot;
        break;
      case "source":
        key = item.source ?? "Unknown";
        break;
    }
    const existing = groups.get(key);
    if (existing) {
      existing.push(item);
    } else {
      groups.set(key, [item]);
    }
  }

  // Sort groups appropriately
  const entries = Array.from(groups.entries());
  if (groupBy === "slot") {
    entries.sort((a, b) => {
      const aKey = a[0];
      const bKey = b[0];
      const aIdx = isSlotType(aKey) ? SLOT_DISPLAY_ORDER.indexOf(aKey) : -1;
      const bIdx = isSlotType(bKey) ? SLOT_DISPLAY_ORDER.indexOf(bKey) : -1;
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

const SLOT_TYPE_SET: ReadonlySet<string> = new Set(SLOT_DISPLAY_ORDER);

function isSlotType(value: string): value is SlotType {
  return SLOT_TYPE_SET.has(value);
}

// ---------------------------------------------------------------------------
// EquipmentSection
// ---------------------------------------------------------------------------

export function EquipmentSection({
  equipment,
  filter,
  sortBy,
  groupBy = "set",
}: {
  readonly equipment: readonly EquipmentPiece[];
  readonly filter: string;
  readonly sortBy: SortOption;
  readonly groupBy?: GroupByOption;
}): React.JSX.Element {
  const filtered = useMemo(() => {
    let result = equipment;
    if (filter !== "") {
      const lower = filter.toLowerCase();
      result = result.filter(
        (item) =>
          item.name.toLowerCase().includes(lower) ||
          (item.setName?.toLowerCase().includes(lower) ?? false) ||
          (item.source?.toLowerCase().includes(lower) ?? false),
      );
    }
    return sortItems(result, sortBy);
  }, [equipment, filter, sortBy]);

  const groups = useMemo(
    () => groupItems(filtered, groupBy),
    [filtered, groupBy]
  );

  return (
    <div className="space-y-1">
      <h3 className="text-sm font-semibold text-accent-gold px-1">
        Equipment
        <span className="ml-2 text-xs text-text-muted font-normal">
          ({filtered.length} items)
        </span>
      </h3>
      {groups.length === 0 ? (
        <p className="text-text-muted text-xs px-1">No matching equipment.</p>
      ) : (
        groups.map((group) => (
          <ItemGroupBlock key={group.name} group={group} />
        ))
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ItemGroupBlock — collapsible group header + item rows
// ---------------------------------------------------------------------------

function ItemGroupBlock({
  group,
}: {
  readonly group: ItemGroup;
}): React.JSX.Element {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="border border-border-subtle rounded-md overflow-hidden">
      <button
        type="button"
        onClick={() => {
          setExpanded((prev) => !prev);
        }}
        className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm font-medium text-text-primary bg-bg-elevated hover:bg-bg-surface transition-colors"
      >
        <span className="text-text-muted text-xs">
          {expanded ? "\u25BC" : "\u25B6"}
        </span>
        <span>
          {group.name}
        </span>
        <span className="text-xs text-text-muted">
          ({group.items.length} {group.items.length === 1 ? "piece" : "pieces"})
        </span>
      </button>
      {expanded && (
        <div className="divide-y divide-border-subtle">
          {group.items.map((item) => (
            <EquipmentRow key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// EquipmentRow — single equipment toggle row
// ---------------------------------------------------------------------------

function EquipmentRow({
  item,
}: {
  readonly item: EquipmentPiece;
}): React.JSX.Element {
  const enabled = useGearPoolStore((s) => s.enabledEquipmentIds.has(item.id));
  const toggle = useGearPoolStore((s) => s.toggleEquipment);

  return (
    <label className="flex items-center gap-2 px-2 py-1 bg-bg-surface hover:bg-bg-elevated transition-colors cursor-pointer">
      <input
        type="checkbox"
        checked={enabled}
        onChange={() => {
          toggle(item.id);
        }}
        className="size-3.5 rounded border-border-default accent-accent-gold"
      />
      <span className="text-sm text-text-primary truncate flex-1">
        {item.name}
      </span>
      <SlotBadge slot={item.slot} />
      {item.socketCount > 0 && (
        <span
          className="text-xs text-rarity-rare"
          title={`${String(item.socketCount)} socket${item.socketCount > 1 ? "s" : ""}`}
        >
          {item.socketCount}&#x25C6;
        </span>
      )}
      <StatSummary stats={item.baseStats} />
    </label>
  );
}
