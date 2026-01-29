/**
 * EquipmentSection — equipment items grouped by set name, with collapsible
 * groups and individual toggle controls.
 */

import { useState, useMemo } from "react";
import type { EquipmentPiece } from "@/models/types";
import { useGearPoolStore } from "@/stores/gear-pool-store";
import { sortItems, type SortOption } from "./sort-select";
import { SlotBadge } from "./slot-badge";
import { StatSummary } from "./stat-summary";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SetGroup {
  readonly name: string;
  readonly items: readonly EquipmentPiece[];
}

// ---------------------------------------------------------------------------
// Grouping helper
// ---------------------------------------------------------------------------

function groupBySet(
  equipment: readonly EquipmentPiece[],
): readonly SetGroup[] {
  const groups = new Map<string, EquipmentPiece[]>();

  for (const item of equipment) {
    const key = item.setName ?? "Standalone";
    const existing = groups.get(key);
    if (existing) {
      existing.push(item);
    } else {
      groups.set(key, [item]);
    }
  }

  return Array.from(groups.entries()).map(([name, items]) => ({
    name,
    items,
  }));
}

// ---------------------------------------------------------------------------
// EquipmentSection
// ---------------------------------------------------------------------------

export function EquipmentSection({
  equipment,
  filter,
  sortBy,
}: {
  readonly equipment: readonly EquipmentPiece[];
  readonly filter: string;
  readonly sortBy: SortOption;
}): React.JSX.Element {
  const filtered = useMemo(() => {
    let result = equipment;
    if (filter !== "") {
      const lower = filter.toLowerCase();
      result = result.filter(
        (item) =>
          item.name.toLowerCase().includes(lower) ||
          (item.setName?.toLowerCase().includes(lower) ?? false),
      );
    }
    return sortItems(result, sortBy);
  }, [equipment, filter, sortBy]);

  const groups = useMemo(() => {
    // Only group by set if sortBy is "set-name"
    if (sortBy === "set-name") {
      return groupBySet(filtered);
    }
    // Otherwise show as flat list under "All Equipment"
    return [{ name: "All Equipment", items: filtered }];
  }, [filtered, sortBy]);

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
          <SetGroupBlock key={group.name} group={group} />
        ))
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SetGroupBlock — collapsible set header + item rows
// ---------------------------------------------------------------------------

function SetGroupBlock({
  group,
}: {
  readonly group: SetGroup;
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
