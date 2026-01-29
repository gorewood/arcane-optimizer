/**
 * GearInventoryPanel — unified panel for browsing, filtering, enabling,
 * and editing equipment. Combines Gear Pool and Data Management.
 */

import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { EquipmentPiece } from "@/models/types";
import type { MergedItem } from "@/data/user-data-types";
import { useGearPoolStore } from "@/stores/gear-pool-store";
import { useUserDataStore } from "@/stores/user-data-store";
import { SortSelect, sortItems, type SortOption } from "@/ui/panels/sort-select";
import { GroupBySelect, type GroupByOption } from "@/ui/panels/group-by-select";
import { FilterChips, matchesActiveFilters, type FilterChipId } from "@/ui/panels/filter-chips";
import { EquipmentEditDialog } from "@/ui/panels/data-management/equipment-edit-dialog";
import { InventoryEquipmentSection } from "./inventory-equipment-section";

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

function useInventoryData(filter: string, sortBy: SortOption, activeFilters: ReadonlySet<FilterChipId>): {
  equipment: readonly MergedItem<EquipmentPiece>[];
  deletedEquipment: readonly MergedItem<EquipmentPiece>[];
} {
  const userEquipment = useUserDataStore((s) => s.userEquipment);
  const getMergedEquipment = useUserDataStore((s) => s.getMergedEquipment);
  const getDeletedEquipment = useUserDataStore((s) => s.getDeletedEquipment);

  const allEquipment = useMemo(() => getMergedEquipment().filter((m) => !m.isDeleted), [getMergedEquipment, userEquipment]);
  const deletedEquipment = useMemo(() => getDeletedEquipment(), [getDeletedEquipment, userEquipment]);

  const equipment = useMemo(() => {
    let result = allEquipment;
    if (filter !== "") {
      const lower = filter.toLowerCase();
      result = result.filter((m) =>
        m.item.name.toLowerCase().includes(lower) ||
        (m.item.setName?.toLowerCase().includes(lower) ?? false) ||
        (m.item.source?.toLowerCase().includes(lower) ?? false)
      );
    }
    if (activeFilters.size > 0) {
      result = result.filter((m) => matchesActiveFilters(m.item.source, m.source === "user", activeFilters));
    }
    const sortedItems = sortItems(result.map((m) => m.item), sortBy);
    const itemToMerged = new Map(result.map((m) => [m.item.id, m]));
    return sortedItems.map((item) => itemToMerged.get(item.id)).filter((m): m is MergedItem<EquipmentPiece> => m !== undefined);
  }, [allEquipment, filter, sortBy, activeFilters]);

  return { equipment, deletedEquipment };
}

// ---------------------------------------------------------------------------
// GearInventoryPanel
// ---------------------------------------------------------------------------

export function GearInventoryPanel(): React.JSX.Element {
  const [filter, setFilter] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("set-name");
  const [groupBy, setGroupBy] = useState<GroupByOption>("set");
  const [activeFilters, setActiveFilters] = useState<ReadonlySet<FilterChipId>>(new Set());
  const [editingItem, setEditingItem] = useState<EquipmentPiece | null>(null);
  const [isNew, setIsNew] = useState(false);

  const enableAll = useGearPoolStore((s) => s.enableAll);
  const disableAll = useGearPoolStore((s) => s.disableAll);
  const { equipment, deletedEquipment } = useInventoryData(filter, sortBy, activeFilters);

  const toggleFilter = useCallback((id: FilterChipId) => {
    setActiveFilters((prev) => { const next = new Set(prev); if (next.has(id)) { next.delete(id); } else { next.add(id); } return next; });
  }, []);
  const handleAddNew = useCallback((): void => { setEditingItem(createNewEquipment()); setIsNew(true); }, []);
  const handleEdit = useCallback((eq: EquipmentPiece): void => { setEditingItem({ ...eq }); setIsNew(false); }, []);
  const handleCloseDialog = useCallback((): void => { setEditingItem(null); }, []);

  return (
    <div className="space-y-4 p-4">
      <InventoryHeader
        filter={filter} onFilterChange={setFilter} sortBy={sortBy} onSortChange={setSortBy}
        groupBy={groupBy} onGroupByChange={setGroupBy} activeFilters={activeFilters} onToggleFilter={toggleFilter}
        onEnableAll={enableAll} onDisableAll={disableAll} onAddNew={handleAddNew}
      />
      <Tabs defaultValue="browse">
        <TabsList variant="line">
          <TabsTrigger value="browse">Browse ({equipment.length})</TabsTrigger>
          <TabsTrigger value="hidden">Hidden ({deletedEquipment.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="browse">
          <InventoryEquipmentSection equipment={equipment} groupBy={groupBy} onEdit={handleEdit} />
        </TabsContent>
        <TabsContent value="hidden">
          <HiddenItemsSection items={deletedEquipment} />
        </TabsContent>
      </Tabs>
      <EquipmentEditDialog equipment={editingItem} isNew={isNew} onClose={handleCloseDialog} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// InventoryHeader
// ---------------------------------------------------------------------------

function InventoryHeader({
  filter,
  onFilterChange,
  sortBy,
  onSortChange,
  groupBy,
  onGroupByChange,
  activeFilters,
  onToggleFilter,
  onEnableAll,
  onDisableAll,
  onAddNew,
}: {
  readonly filter: string;
  readonly onFilterChange: (value: string) => void;
  readonly sortBy: SortOption;
  readonly onSortChange: (value: SortOption) => void;
  readonly groupBy: GroupByOption;
  readonly onGroupByChange: (value: GroupByOption) => void;
  readonly activeFilters: ReadonlySet<FilterChipId>;
  readonly onToggleFilter: (id: FilterChipId) => void;
  readonly onEnableAll: () => void;
  readonly onDisableAll: () => void;
  readonly onAddNew: () => void;
}): React.JSX.Element {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 flex-wrap">
        <h2 className="text-lg font-bold text-text-primary">Gear Inventory</h2>
        <div className="flex gap-1.5 ml-auto">
          <Button variant="outline" size="xs" onClick={onAddNew}>
            + Add
          </Button>
          <Button variant="outline" size="xs" onClick={onEnableAll}>
            Enable All
          </Button>
          <Button variant="outline" size="xs" onClick={onDisableAll}>
            Disable All
          </Button>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <SearchInput value={filter} onChange={onFilterChange} />
        <SortSelect value={sortBy} onChange={onSortChange} />
        <GroupBySelect value={groupBy} onChange={onGroupByChange} />
      </div>
      <FilterChips activeFilters={activeFilters} onToggle={onToggleFilter} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// SearchInput
// ---------------------------------------------------------------------------

function SearchInput({
  value,
  onChange,
}: {
  readonly value: string;
  readonly onChange: (value: string) => void;
}): React.JSX.Element {
  return (
    <div className="relative">
      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted text-sm pointer-events-none">
        Search
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => { onChange(e.target.value); }}
        placeholder="Filter by name..."
        className="w-full rounded-md border border-border-default bg-bg-surface px-2 py-1.5 pl-16 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-gold focus:outline-none focus:ring-1 focus:ring-accent-gold"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// HiddenItemsSection
// ---------------------------------------------------------------------------

function HiddenItemsSection({
  items,
}: {
  readonly items: readonly MergedItem<EquipmentPiece>[];
}): React.JSX.Element {
  const restoreEquipment = useUserDataStore((s) => s.restoreEquipment);

  if (items.length === 0) {
    return <p className="text-text-muted text-sm p-2">No hidden items.</p>;
  }

  return (
    <div className="space-y-1">
      {items.map((merged) => (
        <div
          key={merged.item.id}
          className="flex items-center gap-2 px-2 py-1.5 bg-bg-surface/50 opacity-60"
        >
          <span className="text-sm text-text-muted truncate flex-1 line-through">
            {merged.item.name}
          </span>
          <Button variant="ghost" size="xs" onClick={() => { restoreEquipment(merged.item.id); }}>
            Restore
          </Button>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createNewEquipment(): EquipmentPiece {
  return {
    id: `custom-${String(Date.now())}`,
    name: "",
    slot: "accessory",
    baseStats: {},
    socketCount: 0,
    maxLevel: 1,
    tags: [],
  };
}
